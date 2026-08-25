# Architecture options

## Backend matrix

| Option | What it reproduces | Required input / automatic fetch | Mainnet features | Programs/CPI | ALT | Sysvars | Solana Repro assessment |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **LiteSVM 0.15.2** | Full wire transactions in an in-process SVM; logs, errors, CUs, account effects | Explicit accounts/programs; no mainnet fetch in core | `with_mainnet_features`, but list is compile-time/current rather than slot-pinned | External `.so`, standard programs, CPI supported when all dependencies exist | Versioned tx support depends on supplying table/account context | Defaults plus setters/warp | **Chosen MVP backend.** Fast, deterministic, embeddable, easy regression tests. Biggest risk is runtime/feature drift. |
| **Surfpool 1.5.0** | Local JSON-RPC surfnet on LiteSVM, transactions and scenarios | Lazy current mainnet state clone | Inherits/configures LiteSVM behavior | Supports deployed programs/CPI with cloned dependencies | RPC-facing support, still current-state cloning | Time travel and cheatcodes | Excellent interactive debugger/control, poor source of historical truth. Add later as UX/runtime adapter, not evidence authority. |
| **solana-test-validator / Agave** | Bank, AccountsDB, RPC, loaders and validator-like transaction pipeline | Genesis plus account/program fixtures; `--clone` fetches current state | `--clone-feature-set` can mimic target cluster **now** | Strongest packaged support for programs/CPI/loaders | Supported with correct accounts | Full Bank sysvars, configurable genesis/warp | Higher validator fidelity but heavy and still cannot invent historical pre-state. Strong second backend for differential validation. |
| **Mollusk** | Single instruction or unconstrained instruction chain in a minified SVM | Explicit program ELF, accounts, feature set, sysvars | Configurable | External program/CPI tracking available | Not a transaction/ALT loader harness | Explicit/configurable | Best for reducing a captured failure to an instruction fixture, not primary transaction replay. |
| **Agave/SVM directly** | Potentially closest transaction-loading/execution pipeline | Exact accounts, programs, Bank/runtime configuration, feature activations | Maximum control | Maximum control | Maximum control | Maximum control | Highest ceiling and highest coupling. Agave v4 runtime APIs are unstable/private unless opted into unstable APIs. Reserve for cases LiteSVM demonstrably cannot model. |
| **RPC `simulateTransaction`** | Current-node simulation with logs/error/CUs/inner instructions | Transaction; node loads **current** cluster state | Node current runtime | Yes, if current dependencies exist | Yes | Node current | Valuable oracle/control, not local or historical replay. |

Primary tool references: [LiteSVM repository](https://github.com/LiteSVM/litesvm), [LiteSVM API](https://docs.rs/litesvm/latest/litesvm/struct.LiteSVM.html), [Mollusk](https://github.com/anza-xyz/mollusk), [Surfpool](https://github.com/solana-foundation/surfpool), and [Agave changelog](https://github.com/anza-xyz/agave/blob/master/CHANGELOG.md).

## Recommended architecture

1. **Capture/eligibility layer (Node):** fetch immutable transaction evidence; classify every account source and confidence; reject unsupported bundles before execution.
2. **Portable bundle:** raw wire transaction + explicit account fixtures + exact backend version + expected effects + blockers.
3. **LiteSVM Rust backend:** primary fast runner, locked dependency graph, signatures and historical blockhash checks disabled explicitly.
4. **Deterministic comparator:** never upgrades an unsupported bundle based on an accidental match.
5. **Agave/test-validator differential backend later:** used only to measure LiteSVM divergence on already-supported bundles.
6. **HistoricalStateProvider boundary:** `StandardRpcProvider`, `FixtureProvider`, and `SnapshotProvider` are present now; future archive or self-indexer adapters must supply explicit provenance metadata and never silently substitute current state.

## Why not Surfpool first?

Its automatic lazy clone is optimized for present-day development. That convenience can hide the central error in this project: current state is not historical pre-state. Surfpool remains useful for exploration and product UX after the capture layer has established provenance.

## Program and runtime capture

Loader-v3 separates a program account from its mutable ProgramData account. A dump today can differ from the executable used at the original slot. Loader-v4 and sBPF verifier/runtime changes add more version coupling. Solana’s runtime also recompiles cached programs when feature activation changes the execution environment. Program byte provenance and runtime version therefore belong in eligibility, not only metadata.

Official program references: [programs](https://solana.com/docs/core/programs), [program deployment](https://solana.com/docs/programs/deploying), and [program execution](https://solana.com/docs/core/programs/program-execution).
