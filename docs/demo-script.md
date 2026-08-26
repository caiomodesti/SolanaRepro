# Two-minute demonstration

This demo uses committed immutable bundles, so it does not depend on live RPC availability. Live `capture` can be shown separately when a suitable endpoint is available.

## 0:00-0:20 — Explain the boundary

> A local replay is only trustworthy if its inputs represent the historical execution context. SolanaRepro records provenance for every relevant input and refuses replay when that evidence is insufficient.

## 0:20-0:45 — Inspect a supported transaction

```bash
node src/cli.js inspect examples/system-transfer/bundle
```

Expected highlights:

```text
Class: SYSTEM_TRANSFER
Eligibility: SUPPORTED
State provenance: 4 PROVEN, 0 INFERRED, 0 CURRENT_ONLY, 0 UNKNOWN
Integrity: VALID
Runtime: COMPATIBLE
```

## 0:45-1:15 — Reproduce a real failure

```bash
node src/cli.js replay examples/deterministic-failure/bundle
node src/cli.js compare examples/deterministic-failure/bundle
node src/cli.js assert examples/deterministic-failure/bundle
```

Expected conclusion:

```text
Expected: FAIL InsufficientFundsForRent{account_index:0}
Actual:   FAIL InsufficientFundsForRent{account_index:0}
Fidelity: EXACT
Result: PASS
```

## 1:15-1:40 — Prove the fail-closed behavior

```bash
node scripts/run-regressions.js
```

Expected corpus result:

```text
System transfer: EXACT
Classic SPL transfer: EXACT
Deterministic failure: EXACT
ALT historical-state detection: UNSUPPORTED
CPI provenance detection: UNSUPPORTED
```

## 1:40-2:00 — Close with the product thesis

> SolanaRepro does not replace local execution tools. It turns supported mainnet incidents into trusted inputs for them. We prefer one exact reproduction over ten misleading partial ones.

## Optional live capture

Only add this segment when a working RPC endpoint and a known supported signature are available:

```bash
export SOLANA_RPC_URL=https://your-rpc.example
node src/cli.js capture <SUPPORTED_SIGNATURE>
```

Do not persist, display, or record a private RPC URL. A live endpoint failure is not evidence against the committed deterministic replay corpus.
