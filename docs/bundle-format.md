# Bundle v0.1 format

`manifest.json` is the trust root. It records schema/tool/runtime versions, signature, slot, transaction class, eligibility, structured reasons, provenance summary, runtime assumptions, and SHA-256 hashes.

Required files are `transaction.json`, `original-execution.json`, `expected.json`, `provenance.json`, and `README.md`. Account fixtures live under `accounts/`, executable fixtures under `programs/`, and lookup metadata under `lookup-tables/`.

`replay.json` and `comparison.json` are derived outputs and are intentionally excluded from the immutable file index. The manifest core has its own hash. Any other byte or file-set change invalidates the bundle.

## Eligibility

`SUPPORTED` requires an allowlisted transaction class, all relevant account state `PROVEN` or deterministically `INFERRED`, supported program provenance, and no unresolved ALT dependency. Otherwise the manifest contains stable reason codes and replay returns `UNSUPPORTED` without invoking LiteSVM.

## Outcomes

- `EXACT`: normalized result/error, logs, compute units, relevant balance effects, token effects, inner instructions, and return data match.
- `SEMANTIC_MATCH`: state/result semantics match while allowed non-semantic runtime output differs.
- `PARTIAL`: some observed dimensions match but a required dimension does not.
- `DIVERGENT`: core result or state effects conflict.
- `UNSUPPORTED`: replay eligibility was not established.

Runtime-only readonly post-account differences are non-semantic. Writable balance and token changes are semantic. Normalization is deterministic and tested; raw evidence remains in the bundle.

