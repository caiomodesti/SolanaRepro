# SolanaRepro project brief

## One line

SolanaRepro turns supported Solana mainnet transactions into verifiable local reproductions and portable regression tests.

## The problem

Execution tools can run Solana transactions locally, but a successful local execution does not prove that the supplied accounts, programs, and environment represent the original historical context. Standard RPC exposes transaction metadata and current account state, but it does not provide arbitrary account bytes at an old slot. That creates a false-confidence risk during incident response, auditing, and regression testing.

## The product

SolanaRepro is an open-source forensic reproduction layer above local execution runtimes:

```text
historical transaction
  -> state discovery
  -> provenance
  -> eligibility
  -> reconstruction
  -> local replay
  -> deterministic comparison
  -> portable regression assertion
```

If every material input has sufficient provenance, the transaction is eligible for replay. If historical evidence is insufficient, SolanaRepro returns `UNSUPPORTED`; it never substitutes present-day state and calls it historical state.

## Current proof

The v0.1 corpus contains five real-mainnet cases:

| Case | Outcome |
| --- | --- |
| System transfer | `EXACT` |
| Classic SPL transfer | `EXACT` |
| Deterministic System failure | `EXACT` |
| Versioned transaction requiring historical ALT state | `UNSUPPORTED` |
| Complex CPI transaction with insufficient provenance | `UNSUPPORTED` |

The supported corpus matches the documented comparison contract, including result/error, normalized logs, compute units, relevant lamport/token effects, inner instructions, and return data where applicable. Nineteen automated tests and the full regression corpus pass on Windows and in published Linux GitHub Actions runs.

## Differentiation

LiteSVM, Mollusk, Agave, and similar tools provide execution or simulation primitives. SolanaRepro does not replace them. It turns real mainnet incidents into trusted, provenance-carrying inputs for local execution tools.

The product boundary is historical discovery, provenance, reconstruction, replay comparison, and a portable forensic/regression artifact. The VM is a replaceable backend.

## Who it is for

- Solana program teams preserving production incidents as regression tests.
- Security researchers and auditors verifying a claimed reproduction.
- Incident responders sharing a portable evidence bundle.
- Runtime and tooling maintainers building public compatibility corpora.

## What v0.1 does not claim

- It does not reproduce every Solana transaction.
- It does not recreate exact historical state for arbitrary accounts.
- It does not yet support universal ALT, CPI, DeFi, Token-2022, oracle, or upgradeable-program history.
- `EXACT` describes the explicit comparator contract under pinned local runtime versions; it is not validator-level bit-for-bit identity.

## Evidence and review

- Repository: https://github.com/caiomodesti/SolanaRepro
- Linux CI: https://github.com/caiomodesti/SolanaRepro/actions/runs/32924377044
- Completion report: [mvp-completion-report.md](mvp-completion-report.md)
- Independent review protocol: [independent-review-guide.md](independent-review-guide.md)
- Two-minute demo: [demo-script.md](demo-script.md)

The most valuable external feedback is adversarial: identify an unsupported input that is incorrectly accepted, an accepted replay whose material state is not defensible, or a documented comparison claim that the evidence does not support.
