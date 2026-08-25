# Adversarial feasibility report

Date: 2026-08-24. Cluster: mainnet-beta. This report distinguishes observed evidence from architectural inference.

## Executive result

The narrow thesis is proven: a real successful System transaction, a simple SPL Token transfer, and a real failed System transaction were captured, bundled, replayed in LiteSVM, objectively compared, and converted to automated regression tests. All three received `EXACT` under the committed rules.

The broad thesis is refuted: a transaction signature plus standard RPC is not sufficient to reproduce arbitrary historical transactions. The v0/ALT and Pump AMM/CPI cases lack defensible historical account pre-state. The lab refuses to label an accidental match as evidence.

## Information available from standard RPC

`getTransaction` supplies the wire transaction, message, signatures, slot, block time, version, error, fee, lamport pre/post balances, selected token pre/post balances, logs, inner instructions, consumed CUs, return data when emitted, and resolved ALT addresses. It does **not** supply full pre-transaction bytes for every account, historical program bytes, exact sysvar values, or the runtime binary/feature set that executed the slot.

`getAccountInfo` and `getMultipleAccounts` expose current account state at a commitment. Their configuration supports `minContextSlot`; there is no standard `slot` selector. `minContextSlot` is a lower freshness bound, not time travel.

`simulateTransaction` is useful as a current-cluster control and returns error, logs, inner instructions (when requested), balances, return data, and CUs. Replacing the historical blockhash and simulating against current state is not a historical replay.

Official references: [getTransaction](https://solana.com/docs/rpc/http/gettransaction), [getAccountInfo](https://solana.com/docs/rpc/http/getaccountinfo), [getMultipleAccounts](https://solana.com/docs/rpc/http/getmultipleaccounts), [simulateTransaction](https://solana.com/docs/rpc/http/simulatetransaction), and [RPC JSON structures](https://solana.com/docs/rpc/json-structures).

## Historical account-state experiment

The probe used account `69SNcRC8…tqtxk`, original slot `441308645`, and observed slot `441311701+`:

| Request | Returned context | Lamports |
| --- | ---: | ---: |
| current | 441311701 | 752,983,980,975 |
| `minContextSlot=441308645` | 441311703 | 752,983,980,975 |
| non-standard `slot=441308645` | 441311703 | 752,983,980,975 |
| future `minContextSlot` | RPC `-32016` | no value |

The transaction metadata proves that this account had 754,181,066,532 lamports before and 754,174,338,109 after execution. The current query returned a later value. This directly demonstrates that `minContextSlot` does not select the original account version. Full evidence is in `artifacts/historical-account-state-experiment.json`.

“Archive RPC” usually means retained ledger/transaction history (`getBlock`, `getTransaction`, often backed by BigTable). It does not add a historical-slot parameter to the standard account API. A provider-specific historical account-state product or a self-maintained versioned account index is a separate dependency.

## Replay experiments

### A — System transfer

- Signature: `2aCEdK4E5AbJoqBXay31frSRQC2BWxwjqqWiJ9r5m6WFTPZSQsXfZ3HbF3YHX6TQFF32kJrTSbcqjWkXKGbC5hvV`
- Slot `441308645`, legacy, 4 accounts, no CPI/ALT.
- Original and replay: success, null error, 6/6 exact logs, 450/450 CUs.
- All compared writable post-balances exact.
- Classification: `EXACT`.

Why defensible: System-owned empty-data account bytes are empty, and `getTransaction.preBalances` supplies the relevant historical lamports.

### B — SPL Token transfer

- Signature: `3JDNbXB5Wwp9h9ocqMFxcPXAU3kN8KNrvJgiL8ksieWFk43rfAYDzAWSndzqtsR4vC1GckbotLtoG75jPUV8BNfv`
- Slot `441310827`, legacy, Token Program only, no CPI/ALT.
- Original and replay: success, null error, 3/3 exact logs, 105/105 CUs.
- Token amounts exact: `513989371` and `2152756` after replay.
- Classification: `EXACT` for observed effects, but the bundle records an assumption.

The historical token amount came from `preTokenBalances` and was patched into offset 64 of a current-layout token account. Other bytes came from the later account snapshot. This technique is useful for a narrowly validated classic SPL transfer, but is not full historical-state recovery.

### C — versioned transaction + ALT

- Signature: `5MEcdGqvxFnTY82f61nj1LHHycUpMvzWC5X9eSBYedbJpd7Qa7XncjvPZakBbSFE7LoV4rhU7HtJJB8K4V1WqrwJ`
- Slot `441308645`, v0, 61 resolved accounts, 4 ALTs, 126,857 CUs.
- Capture succeeded; 20 writable/closed accounts lack defensible pre-state.
- Replay eligibility: `UNSUPPORTED_HISTORICAL_PRESTATE`.

The transaction metadata resolves loaded addresses, but deterministic execution also needs the relevant account contents and historically correct ALT/program/runtime context.

### D/F — CPI and DeFi

- Signature: `54b9hP8NQgRJmEss1SR4CnoNDJadymC7JavnKE773pF1WXGanrtpAX2grrd2tDPWEn9aDFiWcogYV9B46uHuVmpB`
- Slot `441308645`, v0, 24 accounts, Pump AMM plus Token, Token-2022, ATA, fee program and System CPIs; 87,349 CUs.
- Program binaries could be captured only as current Loader-v3 ProgramData bytes.
- One account is now unavailable and another writable account is current-state-only.
- Replay eligibility: `UNSUPPORTED_HISTORICAL_PRESTATE`.

### E — real failed transaction

- Signature: `mThLKQEAhXHzHxozzWm8ZnhX5YZoSprNfzV5zaMrRMh9UNweAYiwFNbNX2E5gfoWP5zu4pG5LrohSgb6awZ2mYo`
- Slot `441309952`, legacy, System transfer.
- Original and replay: failure, `InsufficientFundsForRent{account_index:0}`, 6/6 exact logs, 450/450 CUs, exact compared balances.
- Classification: `EXACT`.

This proves the most valuable incident-regression path for a supported deterministic subset.

## Bundle and comparison rules

Bundle schema `0.1` stores source metadata, raw transaction, per-account provenance, captured program files, ALT descriptors, expected effects, backend/runtime versions, feature-set mode, structured blockers and known limitations.

Classification is deterministic:

- `EXACT`: result, canonical error, logs, CUs, compared lamport/token post-balances, inner instructions and return data all equal.
- `HIGH_FIDELITY`: result/error and inner instructions equal; log LCS-Dice similarity ≥ 0.95; CU delta ≤ 1%; compared balances equal.
- `PARTIAL`: result/error equal but a high-fidelity threshold misses.
- `FAILED`: result or canonical error differs.
- `UNSUPPORTED`: historical pre-state is not defensible, even if a forced attempt happens to match.

## Tool-version and supply-chain finding

The JavaScript LiteSVM 1.3.0 package did not provide a usable Windows native binding. The implementation therefore uses Rust LiteSVM `0.15.2`. Its loose internal Agave semver constraints initially resolved a mixed `4.2.1` graph that failed to compile; all runtime-coupled crates are pinned to the compatible Agave `4.1.1` family in `Cargo.toml`/`Cargo.lock`. The observed RPC reported API version `4.2.0`, so runtime-version drift remains a real fidelity risk.
