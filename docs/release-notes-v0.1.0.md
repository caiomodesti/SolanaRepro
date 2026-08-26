# SolanaRepro v0.1.0

SolanaRepro v0.1.0 is the first evidence-bounded source release of the open-source forensic transaction reproduction infrastructure for Solana.

It turns supported real-mainnet transactions into portable local reproductions and CI regression assertions. When historical provenance is insufficient, it returns `UNSUPPORTED` instead of substituting current account state.

## Demonstrated in this release

- System transfer: `EXACT`.
- Classic SPL transfer: `EXACT`.
- Deterministic System failure: `EXACT`.
- ALT historical-state case: `UNSUPPORTED`.
- Complex CPI provenance case: `UNSUPPORTED`.
- Nineteen automated tests plus the five-case regression corpus.
- Clean-clone Windows verification and successful Linux GitHub Actions verification.

## Core workflows

```bash
solrepro capture <signature>
solrepro inspect <bundle>
solrepro replay <bundle>
solrepro compare <bundle>
solrepro assert <bundle>
```

## Trust boundary

`EXACT` is limited to the documented comparator contract and pinned local backend. This release does not claim universal transaction replay, arbitrary historical account reconstruction, or bit-for-bit identity with the historical validator.

Not yet supported: universal ALT, complex CPI/DeFi, Token-2022, oracle history, arbitrary upgradeable-program history, and vendor archive-provider integration.

## Install from source

Requirements: Node.js 22+, Rust stable, and a native build toolchain. Windows uses `stable-x86_64-pc-windows-msvc` and also requires a compatible Perl installation for the pinned native dependency graph.

```bash
npm ci --ignore-scripts
cargo build --locked -p repro-replay
npm link
solrepro --version
npm run test:ci
```

On Windows PowerShell, replace `cargo build` with `.\scripts\build-replay.ps1`. The Windows GNU Rust host is not part of the verified v0.1 build path.

This release publishes source and GitHub-generated source archives. It does not publish an npm package or prebuilt native binaries.

## Review

Independent and adversarial review is welcome. Follow [`docs/independent-review-guide.md`](https://github.com/caiomodesti/SolanaRepro/blob/v0.1.0/docs/independent-review-guide.md) and report the exact commit, environment, commands, and minimal reproduction for any finding.
