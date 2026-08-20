# Release History

***************** 
## Release ONDEWO NLU Js Client 7.0.0 
 
### Breaking Changes 
 * Tracking API Version [7.0.0](https://github.com/ondewo/ondewo-nlu-api/releases/tag/7.0.0) ( [Documentation](https://ondewo.github.io/ondewo-nlu-api/) ) 
 * BREAKING: the `Login` RPC and its `LoginRequest` / `LoginResponse` messages are removed, together with the `POST /v2/login` HTTP binding. Authentication is Keycloak-only - obtain an access token from Keycloak and send it as the `Authorization: Bearer &lt;token&gt;` header on every call. 
 * Migration: construct the client with `keycloak_url`, `realm`, `client_id`, `user_name` and `password` in the `ClientConfig` and it mints and refreshes the token itself. The identity used must be exempt from 2FA, so create one with `CreateProjectTechnicalUser` and pass its `username` (not an e-mail). `CheckLogin` is not affected and remains the way to probe whether a token is still valid. 
 * Also in this release: session-feedback CRUD and analytics RPCs on `Sessions`, full notification CRUD on `Users`, and remote-operation container logs/status RPCs on `Operations`. 


*****************

## Release ONDEWO NLU Js Client 7.0.0

### Improvements

* Tracking API Version [7.0.0](https://github.com/ondewo/ondewo-nlu-api/releases/tag/7.0.0) ( [Documentation](https://ondewo.github.io/ondewo-nlu-api/) )
* Generated with [ondewo-proto-compiler](https://github.com/ondewo/ondewo-proto-compiler) 5.11.0
* Unit tests for the whole hand-written surface, gated at 100% statement/branch/function/line coverage,
  plus a `tsc --checkJs --strict` JSDoc type check, run on every push and pull request

### Breaking Changes

* The `Users.Login` RPC and its `LoginRequest` / `LoginResponse` messages are removed from the generated
  client. Authenticate with a Keycloak access token instead -- see `auth/offlineTokenProvider.js`
  (`login()`), which performs the ROPC + `offline_access` flow and auto-refreshes the token. The identity
  used must be exempt from 2FA, because the token is obtained with a non-interactive password grant.
  `Users.CheckLogin` is unaffected and remains the token-validity probe.

*****************

## Release ONDEWO NLU Js Client 6.14.0

### Improvements

* Tracking API Version [6.14.0](https://github.com/ondewo/ondewo-nlu-api/releases/tag/6.14.0) ( [Documentation](https://ondewo.github.io/ondewo-nlu-api/) )

*****************

## Release ONDEWO NLU Js Client 6.13.0

### Improvements

* Tracking API Version [6.13.0](https://github.com/ondewo/ondewo-nlu-api/releases/tag/6.13.0) ( [Documentation](https://ondewo.github.io/ondewo-nlu-api/) )

*****************

## Release ONDEWO NLU Js Client 6.12.0

### Improvements

* Tracking API Version [6.12.0](https://github.com/ondewo/ondewo-nlu-api/releases/tag/6.12.0) ( [Documentation](https://ondewo.github.io/ondewo-nlu-api/) )

*****************

## Release ONDEWO NLU Js Client 6.11.0

### Improvements

* Tracking API Version [6.11.0](https://github.com/ondewo/ondewo-nlu-api/releases/tag/6.11.0) ( [Documentation](https://ondewo.github.io/ondewo-nlu-api/) )

*****************

## Release ONDEWO NLU Js Client 6.10.0

### Improvements

* Tracking API Version [6.10.0](https://github.com/ondewo/ondewo-nlu-api/releases/tag/6.10.0) ( [Documentation](https://ondewo.github.io/ondewo-nlu-api/) )

*****************

## Release ONDEWO NLU Js Client 6.9.0

### Improvements

* Tracking API Version [6.9.0](https://github.com/ondewo/ondewo-nlu-api/releases/tag/6.9.0) ( [Documentation](https://ondewo.github.io/ondewo-nlu-api/) )

*****************

## Release ONDEWO NLU Js Client 6.8.0

### Improvements

* Tracking API Version [6.8.0](https://github.com/ondewo/ondewo-nlu-api/releases/tag/6.8.0) ( [Documentation](https://ondewo.github.io/ondewo-nlu-api/) )

*****************

## Release ONDEWO NLU Js Client 6.7.0

### Improvements

* Tracking API Version [6.7.0](https://github.com/ondewo/ondewo-nlu-api/releases/tag/6.7.0) ( [Documentation](https://ondewo.github.io/ondewo-nlu-api/) )

*****************

## Release ONDEWO NLU Js Client 6.6.0

### Improvements

* Tracking API Version [6.6.0](https://github.com/ondewo/ondewo-nlu-api/releases/tag/6.6.0) ( [Documentation](https://ondewo.github.io/ondewo-nlu-api/) )

*****************

## Release ONDEWO NLU Js Client 6.5.0

### Improvements

* Tracking API Version [6.5.0](https://github.com/ondewo/ondewo-nlu-api/releases/tag/6.5.0) ( [Documentation](https://ondewo.github.io/ondewo-nlu-api/) )

*****************

## Release ONDEWO NLU Js Client 6.4.0

### Improvements

* Tracking API Version [6.4.0](https://github.com/ondewo/ondewo-nlu-api/releases/tag/6.4.0) ( [Documentation](https://ondewo.github.io/ondewo-nlu-api/) )

*****************

## Release ONDEWO NLU Js Client 6.3.0

### Improvements

* Tracking API Version [6.3.0](https://github.com/ondewo/ondewo-nlu-api/releases/tag/6.3.0) ( [Documentation](https://ondewo.github.io/ondewo-nlu-api/) )

*****************

## Release ONDEWO NLU Js Client 6.2.0

### Improvements

* Tracking API Version [6.2.0](https://github.com/ondewo/ondewo-nlu-api/releases/tag/6.2.0) ( [Documentation](https://ondewo.github.io/ondewo-nlu-api/) )

*****************

## Release ONDEWO NLU Js Client 6.1.0

### Improvements

* Tracking API Version [6.1.0](https://github.com/ondewo/ondewo-nlu-api/releases/tag/6.1.0) ( [Documentation](https://ondewo.github.io/ondewo-nlu-api/) )

*****************

## Release ONDEWO NLU Js Client 6.0.0

### Improvements

* Tracking API Version [6.0.0](https://github.com/ondewo/ondewo-nlu-api/releases/tag/6.0.0) ( [Documentation](https://ondewo.github.io/ondewo-nlu-api/) )

*****************

## Release ONDEWO NLU Js Client 3.4.0

### Improvements

* Tracking API Version [3.4.0](https://github.com/ondewo/ondewo-nlu-api/releases/tag/3.4.0) ( [Documentation](https://ondewo.github.io/ondewo-nlu-api/) )

*****************

## Release ONDEWO NLU Js Client 3.3.0

### Improvements

* Tracking API Version [3.3.0](https://github.com/ondewo/ondewo-nlu-api/releases/tag/3.3.0) ( [Documentation](https://ondewo.github.io/ondewo-nlu-api/) )

*****************

## Release ONDEWO NLU Js Client 3.2.0

### Improvements

* Tracking API Version [3.2.0](https://github.com/ondewo/ondewo-nlu-api/releases/tag/3.2.0) ( [Documentation](https://ondewo.github.io/ondewo-nlu-api/) )

*****************

## Release ONDEWO NLU Js Client 3.1.0

### Improvements

* Tracking API Version [3.1.0](https://github.com/ondewo/ondewo-nlu-api/releases/tag/3.1.0) ( [Documentation](https://ondewo.github.io/ondewo-nlu-api/) )

*****************

## Release ONDEWO NLU Js Client 3.0.0

### Improvements

* Tracking API Version [3.0.0](https://github.com/ondewo/ondewo-nlu-api/releases/tag/3.0.0) ( [Documentation](https://ondewo.github.io/ondewo-nlu-api/) )

*****************

## Release ONDEWO NLU Js Client 2.14.0

### Improvements

* Tracking API Version [2.14.0](https://github.com/ondewo/ondewo-nlu-api/releases/tag/2.14.0) ( [Documentation](https://ondewo.github.io/ondewo-nlu-api/) )

*****************

## Release ONDEWO NLU JS Client 2.13.0

* Track version 2.13.0 of [ONDEWO NLU API](https://github.com/ondewo/ondewo-nlu-api/releases/2.13.0)
* [[OND211-2039]](https://ondewo.atlassian.net/browse/OND211-2039) - Implemented automated release for GitHub and NPM
* [[OND211-2039]](https://ondewo.atlassian.net/browse/OND211-2039) - Added pre-commit hooks and adjusted files to them
