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
// Auth (post-Keycloak migration): the legacy cai-token / HTTP-basic / Users.login() credential flow was
// removed. Obtain a short-lived bearer access token from auth/offlineTokenProvider.js (login()) and send
// it as the `authorization` gRPC-web metadata header on every call.
//
// Browser wiring (index.html loads api/ondewo_nlu_api.js as the `ondewo_nlu_api` global):
//   const names = await listAgentDisplayNames({
//       api: ondewo_nlu_api,
//       grpcWebHost: 'https://localhost:8443',
//       keycloakUrl: 'https://localhost:8443/auth',
//       realm: 'ondewo-ccai-platform',
//       clientId: 'ondewo-nlu-cai-sdk-public',
//       username: 'tech-user@example.com',
//       password: 'super-secret'
//   });

'use strict';

/* global require, module */

const { login } = require('../auth/offlineTokenProvider');

// The NLU List* RPCs default to page_size=10; request a large page so the example returns every agent.
const DEFAULT_PAGE_TOKEN = 'page_size-10000';

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
 * @property {typeof login} [loginImpl]
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
 */
async function listAgentDisplayNames(options) {
	const api = options.api;
	const loginImpl = options.loginImpl !== undefined ? options.loginImpl : login;
	const clientFactory =
		options.clientFactory !== undefined
			? options.clientFactory
			: (host) => new api.AgentsPromiseClient(host, null, null);

	const provider = await loginImpl({
		keycloakUrl: options.keycloakUrl,
		realm: options.realm,
		clientId: options.clientId,
		username: options.username,
		password: options.password
	});
	try {
		const client = clientFactory(options.grpcWebHost);
		const request = new api.ListAgentsRequest();
		request.setPageToken(DEFAULT_PAGE_TOKEN);
		const metadata = { authorization: provider.getAuthorizationHeader() };
		const response = await client.listAgents(request, metadata);
		return response.getAgentsWithOwnersList().map((agentWithOwner) => agentWithOwner.getAgent().getDisplayName());
	} finally {
		provider.stop();
	}
}

module.exports = { listAgentDisplayNames, DEFAULT_PAGE_TOKEN };
