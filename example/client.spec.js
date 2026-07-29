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

// Unit test for the browser ListAgents example. The gRPC-web client is MOCKED -- there is NO network
// access -- but the REAL generated ListAgentsRequest / ListAgentsResponse messages are used, so the test
// also proves the example still builds a valid request after a proto regeneration.
//   node --test example/client.spec.js
//
// Requiring this module does not run the example: example/client.js only auto-runs when CommonJS
// `module` is undefined, which is the case in the browser and never under node.

'use strict';

/* global require, __dirname */

const { test: runTestCase } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { listAgentsExample, reportFailure, DEFAULT_PAGE_TOKEN } = require('./client');

/**
 * The gRPC-web endpoint hard-coded in the example; asserted so a change to it cannot pass unnoticed.
 *
 * @type {string}
 */
const EXPECTED_GRPC_WEB_HOST = 'https://localhost:8443';

/**
 * The placeholder bearer token hard-coded in the example; asserted so the `Bearer ` prefix -- the
 * likeliest thing for a reader to get wrong -- stays intact.
 *
 * @type {string}
 */
const EXPECTED_AUTHORIZATION = 'Bearer <paste-a-valid-access-token-here>';

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
 * The generated gRPC-web namespace, loaded once and shared by every test case.
 *
 * @type {any}
 */
const generatedApi = loadApiNamespace();

/**
 * Build a REAL ListAgentsResponse populated with agents carrying the given display names.
 *
 * @param {string[]} displayNames
 *   The display names to wrap in `AgentWithOwner` -> `Agent` messages.
 * @returns {any}
 *   A generated ListAgentsResponse the mocked client resolves with.
 */
function makeListAgentsResponse(displayNames) {
	const response = new generatedApi.ListAgentsResponse();
	const agentsWithOwners = displayNames.map((displayName) => {
		const agent = new generatedApi.Agent();
		agent.setDisplayName(displayName);
		const agentWithOwner = new generatedApi.AgentWithOwner();
		agentWithOwner.setAgent(agent);
		return agentWithOwner;
	});
	response.setAgentsWithOwnersList(agentsWithOwners);
	return response;
}

/**
 * What the stubbed gRPC-web client observed on the call the example made.
 *
 * @typedef {object} RecordedRpc
 * @property {string} [host]
 *   The endpoint the client was constructed with.
 * @property {any} [request]
 *   The generated ListAgentsRequest the example built.
 * @property {any} [metadata]
 *   The gRPC-web call metadata the example attached.
 */

/**
 * Build the generated namespace with ONLY `AgentsPromiseClient` replaced by a recording stub, so the
 * example's real message construction still runs against the generated bundle.
 *
 * @param {(request: any, metadata: any) => Promise<any>} listAgentsImpl
 *   The stand-in for the `listAgents` RPC.
 * @returns {{ api: any, recorded: RecordedRpc }}
 *   The patched namespace and the mutable record of what the example sent.
 */
function makeApiStub(listAgentsImpl) {
	/** @type {RecordedRpc} */
	const recorded = {};
	const api = {
		...generatedApi,
		AgentsPromiseClient: class {
			/**
			 * @param {string} host
			 *   The gRPC-web endpoint the example built the client with.
			 */
			constructor(host) {
				recorded.host = host;
			}

			/**
			 * @param {any} request
			 *   The generated ListAgentsRequest the example built.
			 * @param {any} metadata
			 *   The gRPC-web call metadata the example attached.
			 * @returns {Promise<any>}
			 *   Whatever the injected implementation resolves or rejects with.
			 */
			listAgents(request, metadata) {
				recorded.request = request;
				recorded.metadata = metadata;
				return listAgentsImpl(request, metadata);
			}
		}
	};
	return { api, recorded };
}

runTestCase('lists and logs the display names of every agent', async () => {
	const stub = makeApiStub(() => Promise.resolve(makeListAgentsResponse(['Agent A', 'Agent B'])));
	/**
	 * The arguments every `console.log` call received while the example ran.
	 * @type {unknown[][]}
	 */
	const logged = [];
	const originalLog = console.log;
	console.log = (...args) => {
		logged.push(args);
	};

	try {
		const displayNames = await listAgentsExample(stub.api);

		assert.deepEqual(displayNames, ['Agent A', 'Agent B']);
		// The client was built against the endpoint hard-coded in the example.
		assert.equal(stub.recorded.host, EXPECTED_GRPC_WEB_HOST);
		// A real ListAgentsRequest carrying the large page token was sent.
		assert.equal(stub.recorded.request.getPageToken(), DEFAULT_PAGE_TOKEN);
		assert.equal(DEFAULT_PAGE_TOKEN, 'page_size-10000');
		// Auth is the bearer header, sent as gRPC-web call metadata.
		assert.deepEqual(stub.recorded.metadata, { Authorization: EXPECTED_AUTHORIZATION });
		assert.deepEqual(logged, [['Agents:', ['Agent A', 'Agent B']]]);
	} finally {
		console.log = originalLog;
	}
});

runTestCase('returns an empty list when the server reports no agents', async () => {
	const stub = makeApiStub(() => Promise.resolve(makeListAgentsResponse([])));
	const originalLog = console.log;
	console.log = () => {};

	try {
		assert.deepEqual(await listAgentsExample(stub.api), []);
	} finally {
		console.log = originalLog;
	}
});

runTestCase('propagates the gRPC status error when the RPC fails', async () => {
	const stub = makeApiStub(() => Promise.reject(new Error('UNAVAILABLE')));
	await assert.rejects(() => listAgentsExample(stub.api), /UNAVAILABLE/);
});

runTestCase('reportFailure logs the error the browser auto-run would have caught', () => {
	/**
	 * The arguments every `console.error` call received.
	 * @type {unknown[][]}
	 */
	const logged = [];
	const originalError = console.error;
	console.error = (...args) => {
		logged.push(args);
	};
	const failure = new Error('UNAVAILABLE');

	try {
		reportFailure(failure);
		assert.deepEqual(logged, [['ListAgents example failed:', failure]]);
	} finally {
		console.error = originalError;
	}
});
