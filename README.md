# SolanaRepro

[![replay-regressions](https://github.com/caiomodesti/SolanaRepro/actions/workflows/ci.yml/badge.svg)](https://github.com/caiomodesti/SolanaRepro/actions/workflows/ci.yml)

**Open-source forensic transaction reproduction infrastructure for Solana.**

SolanaRepro reconstructs the historical context that can be defended, replays a transaction locally, and measures equivalence against its original mainnet execution. Its first major use case is portable regression testing.

> SolanaRepro turns supported Solana mainnet transactions into verifiable local reproductions and portable regression tests.

It does **not** claim to reproduce every transaction or recreate arbitrary historical state. Trust is the boundary: sufficient provenance leads to `SUPPORTED` and replay; insufficient provenance leads to `UNSUPPORTED`. Current state is never mislabeled as historical state.

**We prefer one exact reproduction over ten misleading partial ones.**

## Why it exists

Real mainnet incidents are difficult to preserve as trusted local fixtures. Execution tools can run a transaction, but they do not establish that every supplied account and program byte represents the original historical context. SolanaRepro adds that evidence and eligibility layer, then produces a reusable regression artifact.

## MVP support

| Transaction class | Evidence | Result |
| --- | --- | --- |
| SOL transfer | Mainnet transaction + reconstructible lamport pre-state | `EXACT` |
| Classic SPL Token transfer | Mainnet transaction + token metadata-derived account fixtures | `EXACT` |
| Deterministic System failure | Mainnet transaction + reconstructible pre-state | `EXACT` |
| ALT, complex CPI, DeFi, Token-2022 | Historical input provenance is not yet sufficient | `UNSUPPORTED` |

`EXACT` means all MVP comparison dimensions match under the documented normalization rules. It is not a statement that the local runtime is the original historical validator binary.

## Not supported

The MVP does not support universal DeFi, complex CPI, ALT reconstruction, Token-2022, oracle history, arbitrary upgradeable program versions, or arbitrary historical account state. These cases remain diagnostic bundles marked `UNSUPPORTED` until a transaction-class proof and suitable historical provider exist.

## Install

Requirements: Node.js 22+, Rust stable, and a native build toolchain. Windows uses the `stable-x86_64-pc-windows-msvc` toolchain and also requires a compatible Perl installation; the provided PowerShell script selects both explicitly.

The first native Windows build compiles vendored OpenSSL and took approximately ten minutes in the recorded clean-clone test; cached builds are much faster.

```bash
npm ci --ignore-scripts
cargo build --locked -p repro-replay
npm link
solrepro --version
```

On Windows PowerShell, replace the generic Cargo build with:

```powershell
.\scripts\build-replay.ps1
```

Do not use the Windows GNU Rust host as an implicit substitute for the documented MSVC build. The vendored OpenSSL path handling differs between those environments.

No npm runtime dependencies are used. LiteSVM `0.15.2` and Agave `4.1.1` are pinned in `Cargo.lock`.

## Capture and inspect

```bash
export SOLANA_RPC_URL=https://your-rpc.example
solrepro capture <SIGNATURE>
solrepro inspect repros/<SIGNATURE>/bundle
```

`capture` obtains immutable transaction evidence through the configured `HistoricalStateProvider`, derives per-account provenance, creates a Bundle v0.1, and reports whether it is replayable. RPC URLs are never persisted.

## Replay, compare, and assert

```bash
solrepro replay examples/system-transfer/bundle
solrepro compare examples/system-transfer/bundle
solrepro assert examples/system-transfer/bundle --fresh
```

Human-readable output is the default. Add `--json` for machines. `assert` exits non-zero for `PARTIAL`, `DIVERGENT`, `UNSUPPORTED`, corruption, or runtime mismatch. Replay is refused before execution when provenance is insufficient.

## Bundle v0.1

A portable bundle includes the raw transaction, original execution evidence, expected effects, account fixtures, provenance, runtime pins, structured eligibility reasons, and a SHA-256 integrity index. See [bundle format](docs/bundle-format.md) and [schema](docs/bundle-schema.json).

The four provenance classes are:

- `PROVEN`: immutable transaction evidence or pinned runtime data establishes the value.
- `INFERRED`: reconstructed deterministically from immutable transaction metadata, with the method recorded.
- `CURRENT_ONLY`: observed after the original slot and never accepted as historical input.
- `UNKNOWN`: unavailable or not defensibly reconstructible.

## Comparison model

The comparator evaluates result/error, normalized logs, compute units, writable SOL balances, token balances, inner instructions, and return data. Outcomes are `EXACT`, `SEMANTIC_MATCH`, `PARTIAL`, `DIVERGENT`, or `UNSUPPORTED`. Exact rules are documented in [bundle format](docs/bundle-format.md).

## CI

```bash
npm run test:ci
```

The GitHub workflow builds the pinned Rust runner, runs unit/integrity/adversarial tests, proves three supported examples as `EXACT`, and verifies explicit ALT/CPI rejection. The first published Linux run passed from commit `1abbdf3`; see the [workflow run](https://github.com/caiomodesti/SolanaRepro/actions/runs/32924089225) and [completion report](docs/mvp-completion-report.md).

## Architecture

```text
historical transaction
  -> HistoricalStateProvider
  -> state discovery + provenance
  -> eligibility gate
  -> portable bundle
  -> LiteSVM replay
  -> deterministic comparison
  -> forensic report / regression assertion
```

The provider boundary currently includes `StandardRpcProvider`, `FixtureProvider`, and `SnapshotProvider`. Future archive providers can implement the same contract without making the core vendor-specific. The standard RPC provider explicitly advertises that arbitrary historical account state is unavailable.

Surfpool is primarily a local/fork development environment. SolanaRepro's product boundary is reproducibility: discovery, provenance, reconstruction, replay, comparison, and a portable forensic result. The VM is a replaceable backend, not the product.

SolanaRepro does not replace local execution tools. It turns real mainnet incidents into trusted inputs for them. The adoption path is intentionally CLI-first: `bug report → repro bundle → CI regression`.

See [architecture](docs/architecture.md), [architecture options](docs/architecture-options.md), [limitations](docs/limitations.md), and [roadmap](docs/roadmap.md).

## Independent review and project evaluation

Start with the [one-page project brief](docs/project-brief.md), run the [two-minute deterministic demo](docs/demo-script.md), and use the [independent review protocol](docs/independent-review-guide.md) to publish a reproducible assessment. Reviews are most valuable when they challenge provenance, comparator honesty, bundle integrity, or the `SUPPORTED` boundary.

The sequenced post-MVP work is tracked in the [execution plan](docs/execution-plan.md). Coverage expansion cannot bypass its evidence gates.

## Security and contributing

Bundles are untrusted data. Paths, symlinks, sizes, schema/runtime pins, and hashes are validated before the Rust process starts. Read [SECURITY.md](SECURITY.md) before handling third-party bundles and [CONTRIBUTING.md](CONTRIBUTING.md) before adding a transaction class.

Licensed under Apache-2.0. See [license rationale](docs/license.md).
