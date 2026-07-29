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

// Minimal browser example, loaded by index.html after api/ondewo_nlu_api.js (which exposes every
// generated client + message class on the `ondewo_nlu_api` global).
//
// Auth is bearer-only: pass a short-lived Keycloak access token as the `Authorization` gRPC-web metadata
// header. Obtain the token from the D18 offline-token provider (auth/offlineTokenProvider.js, login())
// bundled into your app; it is a placeholder below. See example/listAgents.js for the same flow as a
// reusable, unit-tested module.

'use strict';

// `ondewo_nlu_api` is the generated gRPC-web namespace defined by the api/ondewo_nlu_api.js bundle that
// index.html loads before this file. `module` is declared for the CommonJS export guard at the bottom,
// which is what lets the unit test require this file without triggering the browser auto-run.
/* global ondewo_nlu_api, module */

/**
 * The page token sent on the ListAgents request. The NLU List* RPCs default to `page_size=10`; a large
 * page is requested so the example returns every agent rather than the first ten. Duplicated from
 * example/listAgents.js on purpose -- this is a classic browser script and cannot `require` it.
 *
 * @type {string}
 */
const DEFAULT_PAGE_TOKEN = 'page_size-10000';

/**
 * List every agent the caller can see and log their display names.
 *
 * @param {any} api
 *   The generated ondewo-nlu-client-js namespace (the `ondewo_nlu_api` browser global); provides the
 *   `AgentsPromiseClient` and `ListAgentsRequest` classes. Typed `any` because the generated bundle
 *   ships no declarations.
 * @returns {Promise<string[]>}
 *   The display name of every agent the server returned.
 * @throws {Error}
 *   When the ListAgents RPC fails; the gRPC-web status error is propagated unchanged.
 */
async function listAgentsExample(api) {
	/**
	 * The gRPC-web endpoint (the envoy front) this example talks to. Edit for your deployment.
	 * @type {string}
	 */
	const grpcWebHost = 'https://localhost:8443';
	/**
	 * The `Authorization` metadata value: the literal word `Bearer`, a space, then a valid Keycloak
	 * access token. Edit for your deployment.
	 * @type {string}
	 */
	const authorization = 'Bearer <paste-a-valid-access-token-here>';

	/**
	 * The gRPC-web Agents client bound to the endpoint above.
	 * @type {any}
	 */
	const client = new api.AgentsPromiseClient(grpcWebHost, null, null);
	/**
	 * The generated ListAgents request message.
	 * @type {any}
	 */
	const request = new api.ListAgentsRequest();
	request.setPageToken(DEFAULT_PAGE_TOKEN);

	/**
	 * The generated ListAgents response message.
	 * @type {any}
	 */
	const response = await client.listAgents(request, { Authorization: authorization });
	/**
	 * The display name of every agent in the response.
	 * @type {string[]}
	 */
	const displayNames = response.getAgentsWithOwnersList().map(
		/**
		 * @param {any} agentWithOwner
		 *   One generated `AgentWithOwner` entry from the response.
		 * @returns {string}
		 *   That agent's display name.
		 */
		(agentWithOwner) => agentWithOwner.getAgent().getDisplayName()
	);
	console.log('Agents:', displayNames);
	return displayNames;
}

/**
 * Log a failed example run. A named function rather than an inline arrow so the unit test can invoke the
 * failure path directly.
 *
 * @param {unknown} error
 *   The rejection value from {@link listAgentsExample}.
 * @returns {void}
 */
function reportFailure(error) {
	console.error('ListAgents example failed:', error);
}

// index.html loads this file as a classic <script>, where CommonJS `module` is undefined -> run the
// example immediately. Under node (`require('./client')`) `module` exists, so the file only exports and
// performs no network call.
/* c8 ignore next 2 -- browser-only auto-run; unreachable under node --test, where `module` is defined */
if (typeof module === 'undefined') {
	listAgentsExample(ondewo_nlu_api).catch(reportFailure);
} else {
	module.exports = { listAgentsExample, reportFailure, DEFAULT_PAGE_TOKEN };
}
