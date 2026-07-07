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

/* global ondewo_nlu_api */

async function listAgentsExample() {
	const grpcWebHost = 'https://localhost:8443';
	const authorization = 'Bearer <paste-a-valid-access-token-here>';

	const client = new ondewo_nlu_api.AgentsPromiseClient(grpcWebHost, null, null);
	const request = new ondewo_nlu_api.ListAgentsRequest();
	request.setPageToken('page_size-10000');

	const response = await client.listAgents(request, { Authorization: authorization });
	const displayNames = response
		.getAgentsWithOwnersList()
		.map((agentWithOwner) => agentWithOwner.getAgent().getDisplayName());
	console.log('Agents:', displayNames);
}

listAgentsExample().catch((error) => console.error('ListAgents example failed:', error));
