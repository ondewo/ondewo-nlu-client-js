// Copyright 2021-2026 ONDEWO GmbH
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

// D18 headless-SDK auth helper (keycloak-migration-plan §7.8 + D18).
//
// One-time ROPC login (grant_type=password, scope=offline_access) against the PUBLIC SDK client
// `ondewo-nlu-cai-sdk-public` (no client_secret -- Q1), then a bounded background loop that refreshes
// the short-lived access token from the offline refresh token before it expires. The current access
// token is exposed for an `Authorization: Bearer <token>` gRPC metadata header. The refresh loop stops
// after `tokenExpirationInS` (if given) has elapsed since login.

'use strict';

/**
 * A minimal structural subset of the WHATWG `Response` consumed by this module: the success flag, the
 * HTTP status, and a `text()` reader. Modelled explicitly (rather than reusing the DOM `Response`) so
 * that the injectable {@link FetchImpl} stub used by the tests satisfies the same contract.
 *
 * @typedef {object} FetchResponse
 * @property {boolean} ok
 *   Whether the HTTP status is in the 2xx range.
 * @property {number} status
 *   The numeric HTTP status code.
 * @property {() => Promise<string>} text
 *   Resolves the response body as a string.
 */

/**
 * The `fetch`-shaped function used to call the Keycloak token endpoint. Injectable so tests can supply
 * a hermetic stub; defaults to `globalThis.fetch` at runtime.
 *
 * @typedef {(url: string, init: object) => Promise<FetchResponse>} FetchImpl
 */

/**
 * The parsed JSON body of a Keycloak OIDC token response. Only the fields this module reads are
 * modelled; Keycloak returns many more (`token_type`, `scope`, `id_token`, ...) that are ignored.
 *
 * @typedef {object} TokenResponse
 * @property {string} access_token
 *   The short-lived bearer access token (always present after {@link postTokenRequest} validation).
 * @property {string} [refresh_token]
 *   The offline refresh token; present on login (offline_access) and on each rotation Keycloak chooses
 *   to perform. Absent when Keycloak does not rotate the offline token on refresh.
 * @property {number} [expires_in]
 *   The access token lifetime in seconds, used to schedule the next refresh. May be absent.
 */

/**
 * The options accepted by {@link login} and the {@link OfflineTokenProvider} constructor. `login`
 * additionally requires the credential fields; the constructor only consumes the connection +
 * injectable-dependency fields.
 *
 * @typedef {object} LoginOptions
 * @property {string} keycloakUrl
 *   The Keycloak base URL (a trailing slash and an embedded `/auth` path are both tolerated).
 * @property {string} realm
 *   The Keycloak realm whose token endpoint is targeted.
 * @property {string} clientId
 *   The PUBLIC SDK client id (`ondewo-nlu-cai-sdk-public`); no client_secret is sent.
 * @property {string} username
 *   The resource-owner username for the ROPC password grant.
 * @property {string} password
 *   The resource-owner password for the ROPC password grant.
 * @property {number} [tokenExpirationInS]
 *   Optional bound, in seconds since login, after which the background refresh loop stops renewing.
 * @property {FetchImpl} [fetchImpl]
 *   Optional `fetch` override; defaults to `globalThis.fetch`.
 * @property {() => number} [nowInMs]
 *   Optional clock returning epoch milliseconds; defaults to `Date.now` (overridable for tests).
 */

/**
 * Seconds of head-room subtracted from a token's `expires_in` so the refresh fires before the access
 * token actually lapses (covers clock skew + the round-trip to Keycloak).
 *
 * @type {number}
 */
const REFRESH_SKEW_IN_S = 30;

/**
 * Lower bound for the scheduled refresh delay so a tiny/zero `expires_in` cannot spin a hot loop.
 *
 * @type {number}
 */
const MIN_REFRESH_DELAY_IN_S = 1;

/**
 * Error raised on any token-endpoint or token-shape failure (non-2xx response, non-JSON body, missing
 * `access_token`/`refresh_token`, missing access token at read time, or invalid {@link login} options).
 */
class TokenError extends Error {
	/**
	 * @param {string} message
	 *   The human-readable failure description.
	 */
	constructor(message) {
		super(message);
		this.name = 'TokenError';
	}
}

/**
 * Build the OIDC token endpoint URL for a realm, tolerating a trailing slash on `keycloakUrl` and an
 * optional `/auth` relative path already baked into it.
 *
 * @param {string} keycloakUrl
 * @param {string} realm
 * @returns {string}
 */
function buildTokenEndpoint(keycloakUrl, realm) {
	const base = keycloakUrl.replace(/\/+$/, '');
	return `${base}/realms/${encodeURIComponent(realm)}/protocol/openid-connect/token`;
}

/**
 * POST an `application/x-www-form-urlencoded` body to the token endpoint and return the parsed JSON.
 * Raises TokenError on a non-2xx response or unparseable / access_token-less body.
 *
 * @param {string} tokenEndpoint
 *   The fully-qualified OIDC token endpoint (see {@link buildTokenEndpoint}).
 * @param {Record<string, string>} params
 *   The form fields to URL-encode into the request body.
 * @param {FetchImpl} fetchImpl
 *   The `fetch`-shaped function used to perform the request.
 * @returns {Promise<TokenResponse>}
 *   The parsed token response, guaranteed to carry a non-empty `access_token`.
 * @throws {TokenError}
 *   On a non-2xx response, a non-JSON body, or a body without a non-empty `access_token`.
 */
async function postTokenRequest(tokenEndpoint, params, fetchImpl) {
	const body = new URLSearchParams(params).toString();
	const response = await fetchImpl(tokenEndpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Accept: 'application/json'
		},
		body
	});
	const text = await response.text();
	if (!response.ok) {
		throw new TokenError(`Keycloak token endpoint returned HTTP ${response.status}: ${text}`);
	}
	/** @type {TokenResponse} */
	let parsed;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new TokenError(`Keycloak token endpoint returned a non-JSON body: ${text}`);
	}
	if (typeof parsed.access_token !== 'string' || parsed.access_token.length === 0) {
		throw new TokenError('Keycloak token response did not contain an access_token');
	}
	return parsed;
}

/**
 * A live access-token holder backed by a bounded auto-refresh loop. Obtain one from {@link login};
 * read {@link OfflineTokenProvider#getAuthorizationHeader} for the gRPC `Authorization` metadata and
 * call {@link OfflineTokenProvider#stop} when done.
 */
class OfflineTokenProvider {
	/**
	 * @param {LoginOptions} options
	 *   The connection + injectable-dependency options. The credential fields (`username`/`password`)
	 *   are not read here; they are passed to {@link OfflineTokenProvider#bootstrap}.
	 */
	constructor(options) {
		/**
		 * The fully-qualified OIDC token endpoint for the configured realm.
		 * @type {string}
		 */
		this.tokenEndpoint = buildTokenEndpoint(options.keycloakUrl, options.realm);
		/**
		 * The PUBLIC SDK client id sent on every token request.
		 * @type {string}
		 */
		this.clientId = options.clientId;
		/**
		 * Optional bound (seconds since login) after which the refresh loop stops; `undefined` = unbounded.
		 * @type {number | undefined}
		 */
		this.tokenExpirationInS = options.tokenExpirationInS;
		/**
		 * The `fetch`-shaped function used for token requests.
		 * @type {FetchImpl}
		 */
		this.fetchImpl = options.fetchImpl !== undefined ? options.fetchImpl : globalThis.fetch;
		/**
		 * The clock returning epoch milliseconds (overridable for tests).
		 * @type {() => number}
		 */
		this.nowInMs = options.nowInMs !== undefined ? options.nowInMs : Date.now;
		/**
		 * The current access token; `null` before {@link OfflineTokenProvider#bootstrap} completes.
		 * @type {string | null}
		 */
		this.accessToken = null;
		/**
		 * The current offline refresh token; `null` before bootstrap.
		 * @type {string | null}
		 */
		this.refreshToken = null;
		/**
		 * The handle of the pending refresh timer, or `null` when none is armed.
		 * @type {ReturnType<typeof setTimeout> | null}
		 */
		this.timer = null;
		/**
		 * Whether {@link OfflineTokenProvider#stop} has been called (latches the loop off).
		 * @type {boolean}
		 */
		this.stopped = false;
		/**
		 * The bounded-loop deadline in epoch milliseconds, or `null` when unbounded.
		 * @type {number | null}
		 */
		this.deadlineInMs = null;
		/**
		 * Optional callback invoked with the error of a failed background refresh.
		 * @type {((error: unknown) => void) | null}
		 */
		this.onRefreshErrorHandler = null;
	}

	/**
	 * Perform the one-time ROPC login and arm the first refresh. Awaited by {@link login}.
	 *
	 * @param {string} username
	 *   The resource-owner username for the password grant.
	 * @param {string} password
	 *   The resource-owner password for the password grant.
	 * @returns {Promise<void>}
	 *   Resolves once the initial tokens are stored and the first refresh is scheduled.
	 * @throws {TokenError}
	 *   On a failed token request or when the response carries no `refresh_token` (the SDK client lacks
	 *   directAccessGrants + the offline_access scope).
	 */
	async bootstrap(username, password) {
		const tokenResponse = await postTokenRequest(
			this.tokenEndpoint,
			{
				grant_type: 'password',
				client_id: this.clientId,
				username,
				password,
				scope: 'offline_access'
			},
			this.fetchImpl
		);
		this.accessToken = tokenResponse.access_token;
		this.refreshToken = typeof tokenResponse.refresh_token === 'string' ? tokenResponse.refresh_token : null;
		if (this.refreshToken === null) {
			throw new TokenError(
				'Keycloak token response did not contain a refresh_token; the SDK client must have ' +
					'directAccessGrants + the offline_access scope (ondewo-nlu-cai-sdk-public)'
			);
		}
		if (this.tokenExpirationInS !== undefined) {
			const expirationInMs = this.tokenExpirationInS * 1000;
			this.deadlineInMs = this.nowInMs() + expirationInMs;
		}
		this.scheduleRefresh(tokenResponse.expires_in);
	}

	/**
	 * Exchange the offline refresh token for a fresh access token and re-arm the next refresh. Returns
	 * early without a network call when the provider is stopped or the bounded deadline has elapsed.
	 *
	 * @returns {Promise<void>}
	 *   Resolves once the access token has been refreshed (or the loop has lapsed/stopped).
	 * @throws {TokenError}
	 *   On a failed refresh token request; surfaced to the {@link OfflineTokenProvider#onRefreshError}
	 *   handler when fired from the background timer.
	 */
	async refresh() {
		if (this.stopped) {
			return;
		}
		// Re-check the bounded deadline at fire time (not just at schedule time): once it has elapsed the
		// loop stops with no further renewal -> the access token lapses -> re-login is required.
		if (this.deadlineInMs !== null && this.nowInMs() >= this.deadlineInMs) {
			this.stop();
			return;
		}
		const tokenResponse = await postTokenRequest(
			this.tokenEndpoint,
			{
				grant_type: 'refresh_token',
				client_id: this.clientId,
				// Non-null here: bootstrap() stores a refresh_token before the first refresh is ever scheduled.
				refresh_token: /** @type {string} */ (this.refreshToken)
			},
			this.fetchImpl
		);
		this.accessToken = tokenResponse.access_token;
		// Keycloak may rotate the offline refresh token; keep the newest one when present.
		if (typeof tokenResponse.refresh_token === 'string' && tokenResponse.refresh_token.length > 0) {
			this.refreshToken = tokenResponse.refresh_token;
		}
		this.scheduleRefresh(tokenResponse.expires_in);
	}

	/**
	 * Arm a single timer for the next refresh, clamped to the bounded deadline. Stops silently once
	 * `tokenExpirationInS` has elapsed (no further renewal -> access lapses -> re-login required).
	 *
	 * @param {number | undefined} expiresInRaw
	 *   The access token lifetime in seconds from the token response; a non-positive or absent value
	 *   falls back to {@link MIN_REFRESH_DELAY_IN_S}.
	 * @returns {void}
	 */
	scheduleRefresh(expiresInRaw) {
		if (this.stopped) {
			return;
		}
		const expiresInS = typeof expiresInRaw === 'number' && expiresInRaw > 0 ? expiresInRaw : MIN_REFRESH_DELAY_IN_S;
		let delayInS = Math.max(expiresInS - REFRESH_SKEW_IN_S, MIN_REFRESH_DELAY_IN_S);
		if (this.deadlineInMs !== null) {
			const remainingInMs = this.deadlineInMs - this.nowInMs();
			if (remainingInMs <= 0) {
				this.stop();
				return;
			}
			delayInS = Math.min(delayInS, remainingInMs / 1000);
		}
		this.timer = setTimeout(() => {
			this.refresh().catch((refreshError) => {
				// Swallow a transient refresh failure but surface it so the caller can react; the next
				// gRPC call gets the stale (possibly expired) token and re-logs in on UNAUTHENTICATED.
				if (this.onRefreshErrorHandler !== null) {
					this.onRefreshErrorHandler(refreshError);
				}
			});
		}, delayInS * 1000);
		// Do not keep the event loop alive solely for the refresh timer.
		// c8 ignore next -- defensive: Node's real setTimeout always returns a Timeout exposing unref(); the
		// non-function branch is unreachable here and only guards against exotic non-Node shims.
		if (typeof this.timer.unref === 'function') {
			this.timer.unref();
		}
	}

	/**
	 * Register a callback invoked with the error of a failed background refresh (optional diagnostics).
	 *
	 * @param {(error: unknown) => void} handler
	 *   The callback receiving the refresh error (typically a {@link TokenError}).
	 * @returns {void}
	 */
	onRefreshError(handler) {
		this.onRefreshErrorHandler = handler;
	}

	/**
	 * The current access token, or null before bootstrap / after the bounded loop has lapsed.
	 *
	 * @returns {string | null}
	 *   The current access token, or `null` when none is available.
	 */
	getAccessToken() {
		return this.accessToken;
	}

	/**
	 * The value for an `Authorization` gRPC metadata header: `Bearer <access_token>`.
	 *
	 * @returns {string}
	 *   The `Bearer <access_token>` header value.
	 * @throws {TokenError}
	 *   When no access token is available (login has not completed or the loop has lapsed).
	 */
	getAuthorizationHeader() {
		if (this.accessToken === null) {
			throw new TokenError('No access token available; login() has not completed or has lapsed');
		}
		return `Bearer ${this.accessToken}`;
	}

	/**
	 * Stop the auto-refresh loop. Idempotent; safe to call from any state.
	 *
	 * @returns {void}
	 */
	stop() {
		this.stopped = true;
		if (this.timer !== null) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}
}

/**
 * One-time ROPC + offline_access login against the PUBLIC SDK client, returning a live token provider
 * whose access token is auto-refreshed in the background until `tokenExpirationInS` elapses.
 *
 * @param {LoginOptions} options
 *   The connection, credential, and (optional) injectable-dependency options.
 * @returns {Promise<OfflineTokenProvider>}
 *   A live provider with a valid access token and an armed background refresh.
 * @throws {TokenError}
 *   When `options` is missing, a required string option is absent/empty, or the login token request
 *   fails / returns an unusable body.
 */
async function login(options) {
	if (options === undefined || options === null) {
		throw new TokenError('login() requires an options object');
	}
	/** @type {(keyof LoginOptions)[]} */
	const requiredKeys = ['keycloakUrl', 'realm', 'clientId', 'username', 'password'];
	for (const key of requiredKeys) {
		const value = options[key];
		if (typeof value !== 'string' || value.length === 0) {
			throw new TokenError(`login() option "${key}" is required and must be a non-empty string`);
		}
	}
	const provider = new OfflineTokenProvider(options);
	await provider.bootstrap(options.username, options.password);
	return provider;
}

module.exports = { TokenError, OfflineTokenProvider, login };
