# Changelog

All notable changes to SolanaRepro are documented in this file.

The project follows Semantic Versioning for source releases. A source release does not imply that an npm package or prebuilt native binary was published.

## [Unreleased]

### Added

- HistoricalStateProvider contract v0.1 with explicit account-state and slot-semantics capabilities.
- Canonical SHA-256 immutable-source manifests for fixture and snapshot providers.
- Provider and response conformance validation enforced by transaction inspection.
- Fail-closed handling for missing manifests, tampered fixtures, missing accounts, source-type confusion, forged provenance, and slot mismatch.

## [0.1.0] - 2026-08-26

### Added

- Provider-neutral `HistoricalStateProvider` boundary with standard RPC, fixture, and snapshot implementations.
- Fail-closed provenance and eligibility engines with stable reason codes.
- Bundle v0.1 with explicit runtime pins, account-level provenance, path and size validation, and SHA-256 integrity.
- `capture`, `inspect`, `replay`, `compare`, and `assert` CLI workflows.
- LiteSVM replay backend pinned to LiteSVM 0.15.2 and Agave 4.1.1 dependencies.
- Three public real-mainnet regression bundles: System transfer, classic SPL transfer, and deterministic System failure.
- Negative ALT and complex-CPI evidence that returns `UNSUPPORTED` when historical inputs are insufficient.
- Unit, integrity, adversarial, and end-to-end regression tests.
- Independent-review protocol, two-minute demo script, public project brief, and grant evidence map.

### Verified

- A fresh Windows clone installed, built from an empty native target, and passed 19 tests plus the five-case corpus.
- Published Linux GitHub Actions runs passed locked Rust tests, replay build, and `npm run test:ci`.

### Known limitations

- Standard Solana RPC does not provide arbitrary historical account bytes at a requested slot.
- ALT reconstruction, complex CPI/DeFi, Token-2022, oracle history, arbitrary program-version history, and universal transaction support remain out of scope.
- The source release does not include prebuilt native binaries or a registry package.

[0.1.0]: https://github.com/caiomodesti/SolanaRepro/releases/tag/v0.1.0
