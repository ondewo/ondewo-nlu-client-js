# Release History

*****************

## Release ONDEWO NLU Js Client 7.1.2

### Bug fixes

* [[OND211-2418]](https://ondewo.atlassian.net/browse/OND211-2418) **The retry cadence introduced
  in 7.1.1 polled the token endpoint once a second for the whole of an outage.** Re-arming the loop
  fixed the dead-timer half of the defect and exposed a second one: the re-arm went through
  `scheduleRefresh(undefined)`, which falls back to `MIN_REFRESH_DELAY_IN_S` (1 s). One client at
  1 Hz is harmless; ondewo runs **one client per call container**, so the clients whose refreshes
  fail together then retry together -- the same thundering-herd shape as the login burst the
  offline-token hand-off exists to remove.
* **The failure path now backs off, and it jitters.** The ceiling grows `5 s * 2 ** (failures - 1)`
  up to a `300 s` cap, and the actual wait is drawn uniformly from `[base, ceiling]`. The jitter is
  the load-bearing half -- a shared ladder without it keeps N clients in lockstep however long the
  delays get. A successful refresh resets the counter, and the `stopped` and deadline guards still
  bound every re-arm.
* **An `onRefreshError` handler that throws no longer kills the refresh loop**, and its error no
  longer escapes the timer callback as an `unhandledRejection` -- which Node terminates the process
  on by default.
* The healthy schedule is untouched: the counter is zero unless a refresh has actually failed, so a
  client that never fails computes exactly the delays 7.1.1 did. The login options take a new
  optional `randomFraction` for the jitter, defaulting to `Math.random`, so a test can make a retry
  delay exact.

*****************

## Release ONDEWO NLU Js Client 7.1.1

### Bug fixes

* [[OND211-2418]](https://ondewo.atlassian.net/browse/OND211-2418) **A single failed background refresh permanently ended proactive token renewal.** `refresh()` re-arms the timer on its last line -- after the `await` that performs the token request -- so when that request threw, `scheduleRefresh()` was never reached and the timer callback's `catch` returned without re-arming. One transient answer from the token endpoint (a 502 from a proxy, a DNS blip, a restarting Keycloak) therefore ended background renewal for the life of the provider, leaving every later token to the stale-token/`UNAUTHENTICATED` fallback. The `catch` now re-arms via `scheduleRefresh(undefined)`, bounded by `MIN_REFRESH_DELAY_IN_S` so a persistently failing endpoint is retried at a floor rather than in a hot loop; the `stopped` and deadline guards still apply, so a stopped provider re-arms nothing.
* The spec now asserts the re-arm and the recovery, and is verified falsifiable -- removing the re-arm fails exactly that test. The same defect and fix landed in the python, typescript, js, nodejs and angular NLU clients.
* *This section was reconstructed after the fact: 7.1.1 shipped to npm and was tagged, but its notes never reached `RELEASE.md`, so the GitHub release body came out empty. See the 7.1.2 note on the release preflight.*

*****************

## Release ONDEWO NLU Js Client 7.1.0

### Improvements

* Tracking API Version [7.1.0](https://github.com/ondewo/ondewo-nlu-api/releases/tag/7.1.0) ( [Documentation](https://ondewo.github.io/ondewo-nlu-api/) )

*****************

## Release ONDEWO NLU Js Client 7.0.1

### Bug Fixes

* [[OND221-2830]](https://ondewo.atlassian.net/browse/OND221-2830) Regenerated with [ondewo-proto-compiler 5.13.0](https://github.com/ondewo/ondewo-proto-compiler/releases/tag/5.13.0).
* [[OND221-2830]](https://ondewo.atlassian.net/browse/OND221-2830) No change to how the auth helper is consumed: this package ships a webpack bundle rather than a public-api barrel, and the auth helper is a Node-only `undici` consumer that does not belong in a browser bundle. It ships as its own CommonJS entry and is imported directly (`require('<pkg>/auth/offlineTokenProvider')`).
* [[OND221-2830]](https://ondewo.atlassian.net/browse/OND221-2830) Tooling: `conventional-pre-commit` now runs before `giticket` at the commit-msg stage - with giticket first, its `[OND221-2830] fix: ...` rewrite was no longer valid Conventional Commits and every commit on a ticket branch failed. `README.md` is prettier-ignored where `.prettierrc` sets `useTabs` and markdownlint's MD010 de-tabs the same blocks, and the codegen `docker run` invocations no longer pass `-it`, which fails outside a TTY.

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
