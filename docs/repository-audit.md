# Repository audit and implementation record

## Starting point

The checkout was an uncommitted feasibility spike with captured mainnet artifacts, a Node research CLI, a LiteSVM Rust runner, three exact regressions, two honest unsupported cases, and research documents. It lacked a product contract, stable bundle version, integrity boundary, provider abstraction, public examples, release/security files, and a final CI claim.

## Reused

- The pinned LiteSVM runner and full wire-transaction execution path.
- Real mainnet capture artifacts and historical-state probe.
- Canonical error/log comparison work.
- The evidence that simple System, classic SPL, and deterministic failure cases are reproducible.
- ALT/CPI counterexamples proving the provenance boundary.

## Reworked

- Product CLI: `capture`, `inspect`, `replay`, `compare`, and `assert`.
- Bundle v0.1 with explicit schema/runtime, structured eligibility, per-account provenance, and SHA-256 integrity.
- Strict transaction allowlist and fail-closed eligibility.
- Classic SPL pre-state reconstruction from immutable token balance metadata rather than current account bytes.
- Objective comparison model and public portable examples.
- Vendor-neutral `HistoricalStateProvider` with standard RPC, fixture, and snapshot adapters.
- Security checks, tests, CI corpus, license, contribution policy, roadmap, and completion evidence.

## Deliberately not implemented

ALT replay, complex CPI/DeFi, Token-2022, archive-provider integration, runtime time travel, and arbitrary program-byte reconstruction remain outside MVP. Existing captured cases are retained as negative evidence.

## Residual debt

The local baseline is committed on `codex/solanarepro-v0.1` and a clean Windows clone has passed installation, cold build, and the full corpus. No remote is configured, GitHub authentication is not usable, and Linux/remote CI therefore cannot be verified. The snapshot adapter is an architectural seam rather than a production snapshot parser. JSON schema is published as documentation while runtime validation uses explicit code; a schema-validator dependency was intentionally avoided for MVP.
