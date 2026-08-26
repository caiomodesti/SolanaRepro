# Roadmap

## Phase 1 — MVP

Ship capture, inspect, replay, compare, assert, Bundle v0.1, provenance policy, local CI corpus, and exact examples for SOL transfer, classic SPL transfer, and a deterministic failure. ALT and complex CPI remain explicitly unsupported.

## Phase 2 — Historical State Providers

Integrate and validate archive or snapshot providers behind `HistoricalStateProvider`. Each adapter must declare coverage, slot semantics, evidence origin, integrity guarantees, and failure behavior. No provider may silently fall back to current state.

Current foundation: provider contract v0.1, canonical immutable-source manifests for fixtures/snapshots, and core-enforced response conformance. A production snapshot parser and archive-provider adapter remain unimplemented.

## Phase 3 — Public benchmark

Publish a reproducible corpus of approximately 100 real transactions and report `EXACT`, `SEMANTIC_MATCH`, `PARTIAL`, and `UNSUPPORTED` rates. Preserve transaction-class and provider breakdowns so aggregate numbers cannot hide weak coverage.

## Phase 4 — Bundle portability

Harden Bundle versioning, migrations, signatures/attestations, content-addressed distribution, and cross-platform reproducibility.

## Phase 5 — One validated class at a time

Evaluate Token-2022, ALT, CPI, Jupiter, Raydium, Orca, Pump, oracles, and upgradeable programs individually. Support requires real historical evidence, positive/negative fixtures, differential runtime checks, and public acceptance criteria.

## Exploratory, not committed

Recorder mode, Surfpool integration, Mollusk fixture export, a distributable GitHub Action, hosted bundle registry, and explorer integrations are possible follow-on projects. None is an MVP commitment.
