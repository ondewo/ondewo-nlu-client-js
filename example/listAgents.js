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

// Minimal, unit-tested example: authenticate with the D18 Keycloak offline-token flow and list the
// display names of every agent the technical user can see.
//
// Auth is bearer-only: obtain a short-lived Keycloak access token from auth/offlineTokenProvider.js
// (login()) and send it as the `Authorization` gRPC-web metadata header on every call.
//
// Browser wiring (index.html loads api/ondewo_nlu_api.js as the `ondewo_nlu_api` global):
//   const names = await listAgentDisplayNames({
//       api: ondewo_nlu_api,
//       grpcWebHost: 'https://localhost:8443',
//       keycloakUrl: 'https://localhost:8443/auth',
//       realm: 'ondewo-ccai-platform',
//       clientId: 'ondewo-nlu-cai-sdk-public',
//       username: 'tech-user@example.com',   // must be a 2FA-exempt technical user (see login())
//       password: 'super-secret'
//   });

'use strict';

/* global require, module */

const { login } = require('../auth/offlineTokenProvider');

/**
 * The page token sent on the ListAgents request. The NLU List* RPCs default to `page_size=10`; a large
 * page is requested so the example returns every agent rather than the first ten.
 *
 * @type {string}
 */
const DEFAULT_PAGE_TOKEN = 'page_size-10000';

/**
 * The subset of {@link login}'s provider this example actually uses: the bearer header for the gRPC-web
 * metadata, and the stop switch for the background refresh loop. Modelled structurally (rather than as
 * the concrete `OfflineTokenProvider`) so the unit test's stub satisfies the same contract.
 *
 * @typedef {object} TokenProviderLike
 * @property {() => string} getAuthorizationHeader
 *   Returns the `Bearer <access_token>` value for the `Authorization` metadata header.
 * @property {() => void} stop
 *   Stops the background token-refresh loop.
 */

/**
 * The `login`-shaped function used to authenticate. Injectable so the unit test can supply a stub;
 * defaults to the real {@link login}.
 *
 * @typedef {(options: import('../auth/offlineTokenProvider').LoginOptions) => Promise<TokenProviderLike>} LoginImpl
 */

/**
 * The options accepted by {@link listAgentDisplayNames}. The credential + connection fields are required;
 * `loginImpl` and `clientFactory` are injection seams the unit test overrides to mock the network.
 *
 * @typedef {object} ListAgentsExampleOptions
 * @property {any} api
 *   The generated ondewo-nlu-client-js namespace (the `ondewo_nlu_api` browser global, or the loaded
 *   stubs); provides the `AgentsPromiseClient` and `ListAgentsRequest` classes.
 * @property {string} grpcWebHost
 *   The gRPC-web endpoint (the envoy front, e.g. `https://localhost:8443`).
 * @property {string} keycloakUrl
 *   The Keycloak base URL for the offline-token login.
 * @property {string} realm
 *   The Keycloak realm.
 * @property {string} clientId
 *   The PUBLIC SDK client id (`ondewo-nlu-cai-sdk-public`).
 * @property {string} username
 *   The technical-user username (ROPC password grant).
 * @property {string} password
 *   The technical-user password.
 * @property {LoginImpl} [loginImpl]
 *   Injection seam for tests; defaults to the real {@link login}.
 * @property {(host: string) => any} [clientFactory]
 *   Injection seam for tests; defaults to `new api.AgentsPromiseClient(host, null, null)`.
 */

/**
 * Log in with the offline-token flow, list all agents, and return their display names. The background
 * token-refresh loop is stopped in a `finally` block so the example never leaks a timer.
 *
 * @param {ListAgentsExampleOptions} options
 *   The connection + credential options (see {@link ListAgentsExampleOptions}).
 * @returns {Promise<string[]>}
 *   The display name of every agent the server returned.
 * @throws {import('../auth/offlineTokenProvider').TokenError}
 *   When the offline-token login fails (bad credentials, unreachable Keycloak, unusable token response).
 * @throws {Error}
 *   When the ListAgents RPC fails; the gRPC-web status error is propagated unchanged.
 */
async function listAgentDisplayNames(options) {
	/**
	 * The generated ondewo-nlu-client-js namespace supplying the client and message classes.
	 * @type {any}
	 */
	const api = options.api;
	/**
	 * The login function to authenticate with: the injected stub, or the real offline-token login.
	 * @type {LoginImpl}
	 */
	const loginImpl = options.loginImpl !== undefined ? options.loginImpl : login;
	/**
	 * The factory building the gRPC-web client: the injected stub, or the generated promise client.
	 * @type {(host: string) => any}
	 */
	const clientFactory =
		options.clientFactory !== undefined
			? options.clientFactory
			: (host) => new api.AgentsPromiseClient(host, null, null);

	/**
	 * The authenticated token provider; its refresh loop is stopped in the `finally` below.
	 * @type {TokenProviderLike}
	 */
	const provider = await loginImpl({
		keycloakUrl: options.keycloakUrl,
		realm: options.realm,
		clientId: options.clientId,
		username: options.username,
		password: options.password
	});
	try {
		/**
		 * The gRPC-web Agents client bound to the configured envoy endpoint.
		 * @type {any}
		 */
		const client = clientFactory(options.grpcWebHost);
		/**
		 * The generated ListAgents request message.
		 * @type {any}
		 */
		const request = new api.ListAgentsRequest();
		request.setPageToken(DEFAULT_PAGE_TOKEN);
		/**
		 * The gRPC-web call metadata; auth is the bearer header from the offline-token provider.
		 * @type {Record<string, string>}
		 */
		const metadata = { Authorization: provider.getAuthorizationHeader() };
		/**
		 * The generated ListAgents response message.
		 * @type {any}
		 */
		const response = await client.listAgents(request, metadata);
		return response.getAgentsWithOwnersList().map(
			/**
			 * @param {any} agentWithOwner
			 *   One generated `AgentWithOwner` entry from the response.
			 * @returns {string}
			 *   That agent's display name.
			 */
			(agentWithOwner) => agentWithOwner.getAgent().getDisplayName()
		);
	} finally {
		provider.stop();
	}
}

module.exports = { listAgentDisplayNames, DEFAULT_PAGE_TOKEN };
