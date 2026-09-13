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

// ESLint flat config for the hand-written JavaScript in this repo. The generated gRPC-web bundle
// (api/), the two git submodules and the release scratch directories are never linted; everything a
// human writes -- auth/, example/ and their specs -- is.

import js from '@eslint/js'; // Core ESLint configuration

/**
 * The flat config consumed by `make eslint` (`eslint --config eslint.config.mjs .`): one ignore block
 * followed by one rule block covering every hand-written `.js` file.
 *
 * @type {import('eslint').Linter.Config[]}
 */
export default [
	{
		ignores: [
			'**/api/',
			'src/ondewo-nlu-api',
			'**/ondewo-proto-compiler',
			'**/*.mjs',
			'npm/',
			'dist/',
			'.test-build/',
			'.test-build-examples/',
			// auth/*.js is deliberately NOT ignored: auth/offlineTokenProvider.js is the only hand-written
			// module this package ships, so it must be linted. Only its generated typings stay out.
			'auth/*.d.ts'
		]
	},
	{
		files: ['**/*.js'], // Target all JavaScript files
		languageOptions: {
			globals: {
				// Add any global variables you want to recognize
				window: true,
				document: true,
				console: true,
				XMLHttpRequest: true,
				uuidv4: true,
				nlu: true
			},
			ecmaVersion: 2022, // Set ECMAScript version
			sourceType: 'module' // If using ES modules
		},
		// `eslint:recommended` plus this repo's house style: const-by-default, strict equality, explicit
		// semicolons, consistent spacing/brace style, and a denylist of uninformative identifiers. Rules
		// set to 'warn' are advisory and do not fail `make eslint`.
		rules: {
			...js.configs.recommended.rules,
			'prefer-const': 'error',
			'no-trailing-spaces': ['error'],
			eqeqeq: ['error', 'always'],
			semi: ['error', 'always'],
			'id-denylist': ['error', 'err', 'any', 'cb', 'callback', 'i1', 'test', 'collection', 'list'],

			'no-multiple-empty-lines': ['error'],
			'no-new-wrappers': ['error'],
			'no-var': ['error'],
			'no-multi-spaces': 'error',
			'block-spacing': ['error', 'always'],

			'brace-style': [
				'error',
				'1tbs',
				{
					allowSingleLine: true
				}
			],

			'comma-spacing': [
				'error',
				{
					before: false,
					after: true
				}
			],

			'semi-spacing': [
				'error',
				{
					before: false,
					after: true
				}
			],
			'no-ternary': 'warn',
			'space-in-parens': ['error', 'never'],
			'space-before-blocks': ['error', 'always'],
			'no-return-assign': 'error',
			'no-mixed-operators': 'warn',
			'no-nested-ternary': 'error',
			'no-unneeded-ternary': 'error',
			'prefer-exponentiation-operator': 'error',

			'arrow-spacing': [
				'error',
				{
					before: true,
					after: true
				}
			],

			'func-call-spacing': ['error', 'never'],

			'key-spacing': [
				'error',
				{
					afterColon: true
				}
			]
		}
	},
	{
		// tests/ holds hand-written CommonJS run on Node (`node --test`), not browser code. The
		// `**/*.js` block above declares browser globals and `sourceType: 'module'`, which makes
		// every `require` and `__dirname` in a spec a no-undef error.
		files: ['tests/**/*.js'],
		languageOptions: {
			globals: {
				require: 'readonly',
				__dirname: 'readonly',
				module: 'writable',
				exports: 'writable',
				process: 'readonly',
				console: 'readonly',
				globalThis: 'readonly'
			},
			ecmaVersion: 2022,
			sourceType: 'commonjs'
		}
	}
];
