# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working Principles

Behavioral guidelines to reduce common mistakes. They bias toward caution over speed; for trivial tasks, use judgment.

### Think before coding

Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### Simplicity first

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### Surgical changes

Touch only what you must. Clean up only your own mess.

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that _your_ changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the user's request.

### Goal-driven execution

Define success criteria. Loop until verified.

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```text
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

These guidelines are working if: fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and
clarifying questions come before implementation rather than after mistakes.

## Git Commits

- **Never include Claude as author or co-author** in commit messages, PR descriptions, or any other text. Do not add
  `Co-Authored-By: Claude…` trailers, "Generated with Claude Code" footers, or any similar attribution.
- The user's own git author identity (already configured in git) is the only identity that should appear on commits.
- This rule overrides the default Claude Code commit-template guidance.
- **Never prepend the JIRA ticket ID** (e.g. `[OND211-2386]`) to the commit subject yourself. The `giticket` pre-commit
  hook reads the ticket from the branch name (`(feature|bugfix|support|hotfix)/<TICKET>-…`) and prepends `[<ticket>]`
  (with a trailing space) automatically. Writing the prefix manually produces a duplicate like
  `[OND211-2386] [OND211-2386] feat: …`. Write the subject as plain Conventional Commits (`feat: …`, `fix(scope): …`,
  `docs(types): …`) and let the hook add the prefix on commit.

## General Principles

- Follow existing patterns before introducing new abstractions.
- Keep changes minimal and consistent with surrounding code.
- Validate inputs early with descriptive, context-rich error messages.
- Use context managers for files, sockets, and thread pools.
- Prefer region comments for grouping methods in files that already use them.
- End edited Markdown and YAML files with a trailing newline.

## Release gotchas (hard-won this session)

These bit us during the 6.14.0 release. Keep them in mind when releasing.

- **Trust the registry, not the log.** `make release_all_clients` wraps each client in `|| echo "Already released …"`, so a _failed_ release is reported as "done". After any release, verify the GitHub release **and** the published package (PyPI / npm) directly.
- **`npm install failed after 5 attempts` in a release log is usually a red herring** — that text is the echo _inside_ the docker `RUN for i in 1..5; do npm install …` retry loop, not a real failure (`npm install` succeeds → `#10 DONE`). Look further down for the real error (a TTY error, an eslint failure, a `setup.py` error).
- **Codegen must run TTY-free.** The `docker run` that invokes the proto-compiler must not pass `-it` — non-interactively it fails with `cannot attach stdin to a TTY-enabled container because stdin is not a terminal`. Fix the script (drop `-it`), or run the whole release under a pseudo-TTY: `script -qc 'make …' /dev/null`.
- **Release Makefiles print secrets.** Some `docker run … -e <TOKEN>=…` recipe lines lack a leading `@`, so `make` echoes the expanded token. Rotate any token printed during a release; fix by prefixing the recipe line with `@`.
- The release auto-pulls the **latest** `ondewo-proto-compiler` tag.
- **npm package names are inconsistent** — e.g. the JS client publishes as `@ondewo/ondewo-nlu-client-js` (double `ondewo`), not `@ondewo/nlu-client-js`. Check `src/package.json`'s `name` before querying npm.
- **`generate` must not use `docker run -it`** — it fails in the non-interactive release (`cannot attach stdin to a TTY`). Use plain `docker run`; keep `-it` only on interactive `--entrypoint /bin/bash` debug commands.

## The release regenerates root package.json — CI test scripts are preserved via `.ci-package.json`

The proto-compiler codegen (`cd src && npm run build`, whose output-volume is the **repo root**) regenerates the ROOT `package.json` on every release, overwriting the CI test scripts with codegen scripts and stripping test devDeps. This silently broke CI after every release. The durable fix, present in this repo:

- **`.ci-package.json`** holds the CI test scripts + test-only devDeps (immune to the codegen).
- **`make restore_ci_test_setup`** runs inside `build` _before_ `create_npm_package` and merges `.ci-package.json` back into the regenerated root `package.json`. It is an **inline `node -e`** on purpose — a helper `.js` file gets caught by the release's type-checked eslint (`no-require-imports`/`typedef`) and fails the release.
- **`remove_npm_script`** strips scripts from the `npm/` _copy_ (never the repo root) and is guarded against a missing `npm/` dir + empty scripts block (previously crashed with Error 255 when `create_npm_package` had not run yet).
- **Runtime deps the shipped auth helper needs (e.g. `undici`) must be declared in `src/package.json`** (the codegen source of truth) — otherwise the codegen strips them from root and the published package is missing them.
- **Tests must never ship. The durable guarantee is the exact-path `"files"` allow-list in `src/package.json`** (mirrored into the root `package.json`, which is regenerated from it). `create_npm_package` copies `auth/` wholesale and only strips specs with a single-level `rm -f npm/auth/*.spec.js`; `npm/package.json` has no `.npmignore`. **Directory entries (`"files": ["api/","auth/"]`) were empirically proven to leak nested spec files** — use exact paths. Adding a newly shipped file means adding it to that array in **both** manifests, or it silently stops publishing.
- **`restore_ci_test_setup` merges with `Object.assign`, which can add and override but never delete.** A script removed from `package.json` alone is resurrected in the regenerated root manifest by the next release — remove it from `.ci-package.json` in the same commit. Anything the CI needs (`test`, `typecheck`, `c8`, `typescript`, `@types/node`) must be listed in `.ci-package.json` or the codegen destroys it.
- The `generate` script uses `docker run` **without `-it`** (a TTY-enabled container breaks the non-interactive release).

## Pre-commit (chained into husky) + the release gotchas

This repo now runs the pre-commit framework (markdownlint-cli2, pre-commit-hooks, giticket, conventional-commit) **alongside** husky's eslint/prettier. Hard-won rules:

- **`.husky/pre-commit` must skip `pre-commit run` during the automated release.** The release's `make run_precommit_hooks…` invokes `.husky/pre-commit` **directly** (not via a git commit); if `.pre-commit-config.yaml` is dirty at that moment, `pre-commit run` aborts with _"Your pre-commit configuration is unstaged"_ → the entire release fails. See the `ONDEWO_RELEASE=1` bullet below for how the skip is done now — the old "is the config unstaged?" check is kept only as a second line of defence, because it fires by accident and stops firing the moment the config is prettier-ignored.
- **The release `git commit` uses `--no-verify`** so husky can't reformat the freshly-generated RELEASE.md / package.json mid-commit and break the release.
- **markdownlint MD053 is disabled** in `.markdownlint-cli2.yaml`. Its auto-fix DELETES the `[comment]: <> (START/END OF GITHUB README)` reference-definition markers that the release Makefile slices the published README with (`perl … /START OF GITHUB README/../END OF GITHUB README/`). **Never re-enable MD053 here** — it silently breaks the README slice.
- **The release skips the `pre-commit run` + test block via an explicit `ONDEWO_RELEASE=1` env var**, not via the old "is `.pre-commit-config.yaml` unstaged?" heuristic. That heuristic only ever worked by accident: the hook's own `make prettier PRETTIER_WRITE=-w` dirtied the config, and the moment the file is prettier-ignored the guard silently stops firing. `make release` now calls `run_precommit_hooks_release` (`ONDEWO_RELEASE=1 .husky/pre-commit`); plain `make run_precommit_hooks` still runs everything. The config-unstaged check is kept as a second line of defence. The release is still gated by `.husky/pre-push` (which runs `npm run typecheck` + `npm test` on each of the release's three `git push` calls) and by tests.yml.
- **`"prepare": "husky"` must stay in all three manifests** (`package.json`, `src/package.json`, `.ci-package.json`). Without it a fresh clone + `npm ci` leaves `core.hooksPath` unset and `.husky/_/` absent, so every hook silently gates nothing for everyone except whoever ran `make install_precommit_hooks` by hand.
- **`npm run typecheck` (`tsc --checkJs --strict` via `tsconfig.typecheck.json`) is what mechanically enforces the JSDoc typing rule.** It uses an explicit `files` list, never globs, so the 241k-line generated bundle can never be pulled in. `example/client.js` is covered too, via the one-line ambient `example/globals.d.ts` that declares the `ondewo_nlu_api` browser global. Do not point it at the inert root `tsconfig.json`, which has no `checkJs` and an `outDir`. Caveat worth knowing: tsc enforces type _correctness_, not the _presence_ of prose — a stripped JSDoc block still passes, so documentation completeness is still a review property.
- **RELEASE.md is the authoritative changelog and the release tag holds the complete history.** A markdownlint/`--all-files` pass (or a careless manual "dedup") can drop `## Release … X.Y.Z` headings; if that happens, restore `RELEASE.md` + `src/RELEASE.md` from the latest release tag.
