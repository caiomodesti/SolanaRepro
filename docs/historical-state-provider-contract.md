# HistoricalStateProvider contract v0.1

Status: Phase 2 foundation. This contract does not integrate an archive vendor or expand the supported transaction classes.

## Purpose

`HistoricalStateProvider` separates evidence acquisition from the SolanaRepro core. An adapter may expose historical data only when it can state what it serves, which slot semantics it honors, and how the source is identified. The core validates both the adapter declaration and every account-state response before using it.

Provider capability is necessary but not sufficient for transaction support. Eligibility, relevant-input provenance, transaction-class proof, runtime compatibility, and comparison rules still apply.

## Capability descriptor

Every provider exposes a descriptor containing:

| Field | Values | Meaning |
| --- | --- | --- |
| `contractVersion` | `0.1` | Provider contract understood by this core |
| `transactionHistory` | boolean | Can return immutable transaction evidence |
| `accountState` | `NONE`, `CURRENT_ONLY`, `HISTORICAL_EXACT` | Strongest account-state semantic the configured instance can provide |
| `programBytes` | `NONE`, `CURRENT_ONLY`, `HISTORICAL_EXACT` | Strongest program-byte semantic the configured instance can provide |
| `slotSemantics` | `NONE`, `MIN_CONTEXT`, `EXACT` | Relationship between the requested slot and returned state |
| `sourceIdentity` | boolean | Source has a stable recorded identity |
| `immutableEvidence` | boolean | Returned historical claims are bound to immutable evidence |

Legacy booleans `arbitraryHistoricalAccountState` and `historicalProgramBytes` remain in the descriptor for Bundle v0.1 compatibility. The conformance validator rejects contradictions between legacy and structured fields.

Rules:

- `HISTORICAL_EXACT` account state requires `EXACT` slot semantics, source identity, and immutable evidence.
- `CURRENT_ONLY` account observations require `MIN_CONTEXT` semantics.
- `minContextSlot` is never interpreted as a historical-state selector.
- Missing configuration reduces capability to `NONE`; it does not produce a partially trusted historical provider.

## Immutable fixture and snapshot sources

`FixtureProvider` and `SnapshotProvider` require a source manifest before they can emit `PROVEN`:

```json
{
  "schemaVersion": "0.1",
  "sourceType": "fixture",
  "sourceId": "public-corpus-2026-08",
  "contentSha256": "<canonical lowercase SHA-256>"
}
```

The digest binds every fixture field except the manifest itself using recursively key-sorted canonical JSON. Provider construction clones and freezes the verified content, so later mutation of the caller's object cannot change the trusted source.

Use `createImmutableSourceManifest(content, { sourceType, sourceId })` to create the manifest. A missing manifest, digest mismatch, unsupported schema, or fixture/snapshot source-type mismatch disables historical capability and forces account results to `UNKNOWN`.

The current contract treats fixture account coverage as listed-only. An account absent from a valid fixture is `UNKNOWN`, not a proven historical non-existence claim.

## Account-state response

A batch response records:

```json
{
  "provider": "fixture",
  "requestedSlot": 42,
  "capturedAtSlot": 42,
  "provenance": "PROVEN",
  "source": {
    "type": "fixture",
    "id": "public-corpus-2026-08",
    "contentSha256": "...",
    "verified": true
  },
  "values": [
    {
      "pubkey": "...",
      "account": {},
      "provenance": "PROVEN"
    }
  ]
}
```

The core enforces:

- provider identity and requested slot match the request;
- response pubkeys match the requested order and count;
- `PROVEN` requires a non-null account, exact captured slot, verified source, and `HISTORICAL_EXACT` capability;
- `CURRENT_ONLY` requires a capture slot at or after the requested slot and a provider that explicitly declares current-only semantics;
- missing standard-RPC observations are `UNKNOWN`, never proof that an account was historically absent;
- aggregate provenance equals the least-trusted per-account result;
- malformed or contradictory responses stop inspection before a bundle is constructed.

## Adapter acceptance checklist

A future archive or custom adapter cannot merge until it provides:

1. A conforming capability descriptor with no vendor-specific logic in the core.
2. Stable source identity and documented authentication/integrity assumptions.
3. Evidence that requested slot semantics are exact, not a freshness lower bound.
4. Per-account provenance and explicit missing-history behavior.
5. Positive tests at known historical slots.
6. Negative tests for unavailable slots, missing accounts, provider fallback, source mismatch, and tampered responses.
7. A real transaction corpus demonstrating what the adapter changes from `UNSUPPORTED` to eligible.
8. Documentation of retention, coverage, rate limits, and trust dependencies.

No adapter may silently fall back to standard current account state. Provider failure and insufficient coverage remain valid `UNSUPPORTED` outcomes.
