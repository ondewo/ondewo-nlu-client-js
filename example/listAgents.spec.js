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

// Unit test for the ListAgents example. The gRPC-web client is MOCKED and the offline-token login is
// stubbed -- there is NO network access. REAL generated protobuf messages (ListAgentsRequest /
// ListAgentsResponse) are built so the test also proves the example produces a valid request.
//   node --test example/listAgents.spec.js

'use strict';

/* global require, __dirname */

const { test: runTestCase } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { listAgentDisplayNames, DEFAULT_PAGE_TOKEN } = require('./listAgents');

/**
 * Load the generated grpc-web stub namespace (a webpack `var`-target browser library) into this process
 * so the test can build REAL ListAgentsRequest / ListAgentsResponse messages instead of hand-rolled fakes.
 *
 * @returns {any}
 *   The `ondewo_nlu_api` namespace object exposing every generated client + message class.
 */
function loadApiNamespace() {
	/**
	 * The path of the minified generated bundle, relative to this spec.
	 * @type {string}
	 */
	const bundlePath = path.join(__dirname, '..', 'api', 'ondewo_nlu_api.min.js');
	/**
	 * The bundle source, evaluated below to obtain the namespace it declares.
	 * @type {string}
	 */
	const source = fs.readFileSync(bundlePath, 'utf8');
	return new Function(`${source}\n;return ondewo_nlu_api;`)();
}

/**
 * The generated gRPC-web namespace, loaded once and shared by every test case. Typed `any` because the
 * generated bundle ships no declarations.
 *
 * @type {any}
 */
const api = loadApiNamespace();

/**
 * The shared example options reused by every test. Credentials are irrelevant here because the login is
 * stubbed; individual tests spread this and add the injection seams under test.
 *
 * @type {{ grpcWebHost: string, keycloakUrl: string, realm: string, clientId: string, username: string, password: string }}
 */
const BASE_OPTIONS = {
	grpcWebHost: 'https://localhost:8443',
	keycloakUrl: 'https://auth.example.com/auth',
	realm: 'ondewo-ccai-platform',
	clientId: 'ondewo-nlu-cai-sdk-public',
	username: 'tech-user@example.com',
	password: 'super-secret'
};

/**
 * The fixed bearer header the stubbed provider yields; asserted on the gRPC-web metadata.
 *
 * @type {string}
 */
const AUTHORIZATION_HEADER = 'Bearer access-token-xyz';

/**
 * Build a fake offline-token provider that records whether stop() was called and yields a fixed header.
 *
 * @returns {{ provider: { getAuthorizationHeader: () => string, stop: () => void }, state: { stopped: boolean } }}
 *   The stub provider and the mutable state its stop() flips.
 */
function makeProviderStub() {
	/**
	 * The mutable state the stub's `stop()` flips, so tests can assert the refresh loop was stopped.
	 * @type {{ stopped: boolean }}
	 */
	const state = { stopped: false };
	/**
	 * The stub provider, satisfying the `TokenProviderLike` contract the example depends on.
	 * @type {{ getAuthorizationHeader: () => string, stop: () => void }}
	 */
	const provider = {
		/**
		 * @returns {string}
		 *   The fixed bearer header the example forwards as gRPC-web metadata.
		 */
		getAuthorizationHeader() {
			return AUTHORIZATION_HEADER;
		},
		/**
		 * @returns {void}
		 */
		stop() {
			state.stopped = true;
		}
	};
	return { provider, state };
}

/**
 * Build a REAL ListAgentsResponse populated with agents carrying the given display names.
 *
 * @param {string[]} displayNames
 *   The display names to wrap in `AgentWithOwner` -> `Agent` messages.
 * @returns {any}
 *   A generated ListAgentsResponse the mocked client resolves with.
 */
function makeListAgentsResponse(displayNames) {
	const response = new api.ListAgentsResponse();
	const agentsWithOwners = displayNames.map((displayName) => {
		const agent = new api.Agent();
		agent.setDisplayName(displayName);
		const agentWithOwner = new api.AgentWithOwner();
		agentWithOwner.setAgent(agent);
		return agentWithOwner;
	});
	response.setAgentsWithOwnersList(agentsWithOwners);
	return response;
}

runTestCase('lists agent display names using a bearer Authorization header', async () => {
	const providerStub = makeProviderStub();
	/**
	 * What the stubbed transport observed, filled in as the example runs.
	 * @type {{ host?: string, request?: any, metadata?: any, loginOptions?: any }}
	 */
	const recorded = {};
	/**
	 * A stub gRPC-web client factory recording the endpoint and the call it received.
	 * @type {(host: string) => any}
	 */
	const clientFactory = (host) => {
		recorded.host = host;
		return {
			/**
			 * @param {any} request
			 *   The generated ListAgentsRequest the example built.
			 * @param {any} metadata
			 *   The gRPC-web call metadata the example attached.
			 * @returns {Promise<any>}
			 *   A response carrying two agents.
			 */
			listAgents(request, metadata) {
				recorded.request = request;
				recorded.metadata = metadata;
				return Promise.resolve(makeListAgentsResponse(['Agent A', 'Agent B']));
			}
		};
	};

	const displayNames = await listAgentDisplayNames({
		...BASE_OPTIONS,
		api,
		loginImpl: (loginOptions) => {
			recorded.loginOptions = loginOptions;
			return Promise.resolve(providerStub.provider);
		},
		clientFactory
	});

	assert.deepEqual(displayNames, ['Agent A', 'Agent B']);
	// The client was built against the configured gRPC-web endpoint.
	assert.equal(recorded.host, BASE_OPTIONS.grpcWebHost);
	// A real ListAgentsRequest carrying the large page token was sent. The literal is asserted too, so
	// shrinking DEFAULT_PAGE_TOKEN back to the RPC default cannot pass silently.
	assert.equal(recorded.request.getPageToken(), DEFAULT_PAGE_TOKEN);
	assert.equal(DEFAULT_PAGE_TOKEN, 'page_size-10000');
	// The credential options were forwarded verbatim to the offline-token login.
	assert.deepEqual(recorded.loginOptions, {
		keycloakUrl: BASE_OPTIONS.keycloakUrl,
		realm: BASE_OPTIONS.realm,
		clientId: BASE_OPTIONS.clientId,
		username: BASE_OPTIONS.username,
		password: BASE_OPTIONS.password
	});
	// Auth is the bearer header from the offline-token provider.
	assert.deepEqual(recorded.metadata, { Authorization: AUTHORIZATION_HEADER });
	// The background refresh loop was stopped once the call completed.
	assert.equal(providerStub.state.stopped, true);
});

runTestCase('returns an empty list when the server reports no agents', async () => {
	const providerStub = makeProviderStub();

	const displayNames = await listAgentDisplayNames({
		...BASE_OPTIONS,
		api,
		loginImpl: () => Promise.resolve(providerStub.provider),
		clientFactory: () => ({
			/**
			 * @returns {Promise<any>}
			 *   A response carrying no agents at all.
			 */
			listAgents() {
				return Promise.resolve(makeListAgentsResponse([]));
			}
		})
	});

	assert.deepEqual(displayNames, []);
	assert.equal(providerStub.state.stopped, true);
});

runTestCase('stops the token provider even when the RPC fails', async () => {
	const providerStub = makeProviderStub();
	const rpcError = new Error('UNAVAILABLE');

	await assert.rejects(
		() =>
			listAgentDisplayNames({
				...BASE_OPTIONS,
				api,
				loginImpl: () => Promise.resolve(providerStub.provider),
				clientFactory: () => ({
					/**
					 * @returns {Promise<any>}
					 *   A rejected call, standing in for a gRPC status error.
					 */
					listAgents() {
						return Promise.reject(rpcError);
					}
				})
			}),
		/UNAVAILABLE/
	);

	// The finally block must have stopped the refresh loop despite the failure.
	assert.equal(providerStub.state.stopped, true);
});

runTestCase('builds the gRPC-web client from the api namespace when no clientFactory is injected', async () => {
	const providerStub = makeProviderStub();
	/**
	 * The `(host, credentials, options)` triple the default client factory passes to the generated client.
	 * @type {unknown[]}
	 */
	let constructorArgs = [];
	/**
	 * The generated namespace with only the promise client swapped for a recording stub, so the DEFAULT
	 * `new api.AgentsPromiseClient(host, null, null)` factory in the example is the code under test.
	 * @type {any}
	 */
	const apiWithStubClient = {
		ListAgentsRequest: api.ListAgentsRequest,
		AgentsPromiseClient: class {
			/**
			 * @param {...unknown} args
			 *   The argument triple the default client factory passes.
			 */
			constructor(...args) {
				constructorArgs = args;
			}

			/**
			 * @returns {Promise<any>}
			 *   A response carrying a single agent.
			 */
			listAgents() {
				return Promise.resolve(makeListAgentsResponse(['Agent A']));
			}
		}
	};

	const displayNames = await listAgentDisplayNames({
		...BASE_OPTIONS,
		api: apiWithStubClient,
		loginImpl: () => Promise.resolve(providerStub.provider)
	});

	assert.deepEqual(displayNames, ['Agent A']);
	assert.deepEqual(constructorArgs, [BASE_OPTIONS.grpcWebHost, null, null]);
	assert.equal(providerStub.state.stopped, true);
});

runTestCase('falls back to the real offline-token login when no loginImpl is injected', async () => {
	// login() validates its five required string options before constructing a provider or calling fetch,
	// so the default seam is exercised hermetically -- no network, no timer.
	await assert.rejects(
		() =>
			listAgentDisplayNames({
				...BASE_OPTIONS,
				api,
				password: '',
				clientFactory: () => ({
					/**
					 * @returns {Promise<any>}
					 *   Never resolves in this test; reaching it would mean login was skipped.
					 */
					listAgents() {
						return Promise.reject(new Error('the RPC must never be reached'));
					}
				})
			}),
		/login\(\) option "password" is required/
	);
});
