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

// Ambient declaration for the ONE browser global the examples use, so `npm run typecheck` can cover
// example/client.js (a classic <script>, where the global is supplied by api/ondewo_nlu_api.js).
//
// `any` is the accurate type: the generated 241k-line bundle ships no declarations, and every consumer
// of it in this repo is documented as `any` for the same reason. This file is type-check-only -- it is
// never published (see the `files` allow-list in package.json) and never bundled.

/**
 * The generated ondewo-nlu-client-js namespace, exposed as a browser global by the
 * `api/ondewo_nlu_api.js` bundle. Provides every generated gRPC-web client and message class.
 */
declare const ondewo_nlu_api: any;
