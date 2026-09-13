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

// A STRING FIELD MUST SURVIVE A BINARY ROUND TRIP THROUGH THE SHIPPED BUNDLE.
//
// This is an artefact test, and it exists because the defect it guards was invisible to every
// source-level check. `api/ondewo_nlu_api.js` is a self-contained browser bundle: it embeds the
// `google-protobuf` runtime present when it was built. The proto compiler emits
// `reader.readStringRequireUtf8()`, a method that does NOT exist in google-protobuf 3.21.4 — and
// `src/package.json` pinned `^3.21.4`, a range that can never reach the 4.x line where it was
// added. The result shipped to npm in 5.5.0, 5.5.1 and 5.5.2: every `deserializeBinary` on a
// message carrying a string threw `TypeError: reader.readStringRequireUtf8 is not a function`.
//
// The .proto sources were right, the generated `_pb.js` was right, the auth suite was green and the
// 100% coverage gate was satisfied. Only the bundle was wrong, so only a test that LOADS THE BUNDLE
// and decodes a message could see it.
//
//   node --test tests/bundleStringRoundTrip.spec.js

'use strict';

const { test: runTestCase } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

/** The generated, bundled API surface this package publishes. */
const BUNDLE_PATH = path.join(__dirname, '..', 'api', 'ondewo_nlu_api.js');

/**
 * Evaluate the browser bundle in an isolated context and hand back the global it defines.
 *
 * The context deliberately provides NO `require`: the bundle must be self-contained, which is the
 * whole point — whatever protobuf runtime it needs has to be inside it.
 *
 * @returns {any} the `ondewo_nlu_api` namespace object.
 */
function loadApiBundle() {
	const source = fs.readFileSync(BUNDLE_PATH, 'utf8');
	const context = { window: {}, global: {}, self: {} };
	context.globalThis = context;
	vm.createContext(context);
	vm.runInContext(source, context);
	assert.ok(context.ondewo_nlu_api, 'the bundle did not define the ondewo_nlu_api global');
	return context.ondewo_nlu_api;
}

runTestCase('a string field survives a binary round trip through the shipped bundle', () => {
	const api = loadApiBundle();
	assert.ok(api.Context, 'the bundle does not export Context');

	const original = new api.Context();
	// A value with multi-byte characters, because the emitted reader is the UTF-8-validating one.
	const contextName = 'projects/p/agent/sessions/s/contexts/begrüßung_äöü';
	original.setName(contextName);

	const bytes = original.serializeBinary();
	assert.ok(bytes.length > 0, 'serialization produced no bytes');

	// This is the line that threw for three published versions.
	const decoded = api.Context.deserializeBinary(bytes);
	assert.equal(decoded.getName(), contextName, 'the string did not survive the round trip');
});

runTestCase('the bundle carries a protobuf runtime able to read the strings it writes', () => {
	const api = loadApiBundle();
	const message = new api.Context();
	message.setName('probe');

	// Assert the property rather than the method name: what matters is that decoding works, not
	// which reader the generator happened to emit. A future generator may emit `readString` again.
	assert.doesNotThrow(
		() => api.Context.deserializeBinary(message.serializeBinary()),
		'the bundled runtime cannot decode a string written by the same bundle'
	);
});
