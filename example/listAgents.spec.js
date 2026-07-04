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
	const bundlePath = path.join(__dirname, '..', 'api', 'ondewo_nlu_api.min.js');
	const source = fs.readFileSync(bundlePath, 'utf8');
	return new Function(`${source}\n;return ondewo_nlu_api;`)();
}

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
	const state = { stopped: false };
	const provider = {
		getAuthorizationHeader() {
			return AUTHORIZATION_HEADER;
		},
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
	const recorded = {};
	const clientFactory = (host) => {
		recorded.host = host;
		return {
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
		loginImpl: () => Promise.resolve(providerStub.provider),
		clientFactory
	});

	assert.deepEqual(displayNames, ['Agent A', 'Agent B']);
	// The client was built against the configured gRPC-web endpoint.
	assert.equal(recorded.host, BASE_OPTIONS.grpcWebHost);
	// A real ListAgentsRequest carrying the large page token was sent.
	assert.equal(recorded.request.getPageToken(), DEFAULT_PAGE_TOKEN);
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
