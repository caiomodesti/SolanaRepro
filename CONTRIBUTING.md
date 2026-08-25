# Contributing

SolanaRepro accepts narrow, evidence-backed changes. Run `npm run test:ci` and `cargo test --locked --workspace` before proposing a change.

## Adding a transaction class

A class is not supported because it replays once. A contribution must include:

1. A strict positive classifier and adversarial negative tests.
2. A documented source for every relevant pre-state byte.
3. At least one real mainnet fixture with an immutable signature and original outcome.
4. A portable bundle whose integrity validates from a clean checkout.
5. An objective comparison and regression assertion.
6. Explicit `UNSUPPORTED` behavior when any required provenance is absent.

Do not broaden an allowlist to make a test pass. Do not use current RPC state as historical state. New provider adapters must declare capabilities and fail closed when a historical query cannot be satisfied.

## Compatibility

Bundle schema and reason-code changes require versioning and migration notes. Runtime dependency changes require rebuilding the example corpus and explaining any output drift. Never silently normalize a semantic difference away.

## Pull requests

Keep changes reviewable, add tests, update relevant docs, and state which evidence is local versus remote. Security-sensitive reports should follow `SECURITY.md`.

