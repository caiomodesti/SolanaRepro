# Architecture

SolanaRepro separates evidence acquisition from reconstruction and execution.

## Provider boundary

`HistoricalStateProvider` is the vendor-neutral contract for transaction evidence, account state, and block context. Implementations declare capabilities instead of implying them:

```text
HistoricalStateProvider
├── StandardRpcProvider   current account observations; no arbitrary historical state
├── FixtureProvider       immutable test/corpus fixtures
├── SnapshotProvider      explicit snapshot-backed fixtures
└── future ArchiveProvider / CustomProvider adapters
```

`StandardRpcProvider` is the MVP capture adapter. `FixtureProvider` and `SnapshotProvider` establish the extension seam and support deterministic tests. No commercial archive provider is integrated in v0.1.

Phase 2 adds a versioned [provider conformance contract](historical-state-provider-contract.md). Exact historical capability requires source identity, immutable evidence, and exact slot semantics. The core validates provider declarations and account responses before bundle construction; an invalid manifest or response fails closed.

## Trust flow

1. Capture the immutable wire transaction and execution metadata.
2. Classify the transaction using a strict allowlist.
3. Assign provenance to every relevant account and program input.
4. Reject the bundle when any required input is `CURRENT_ONLY` or `UNKNOWN`.
5. Validate schema, pinned runtime, path safety, size limits, and SHA-256 integrity.
6. Replay the unchanged wire transaction in pinned LiteSVM.
7. Compare objective execution dimensions and emit an explicit outcome.

An accidental match can never upgrade an `UNSUPPORTED` bundle.

## Backend boundary

The Node.js core owns evidence and policy. The Rust executable is a small isolated LiteSVM adapter. It receives only validated bundle data, disables signature verification and blockhash-age checks for historical execution, and returns structured JSON. Those exceptions are replay mechanics, not evidence claims.

## Extending support

A new transaction type must supply a narrow classifier, a defensible reconstruction proof, negative fixtures, a real mainnet example, and exact comparison evidence. Provider capability alone does not make a transaction class supported.
