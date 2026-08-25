# Solana Repro bundle

- Signature: `2aCEdK4E5AbJoqBXay31frSRQC2BWxwjqqWiJ9r5m6WFTPZSQsXfZ3HbF3YHX6TQFF32kJrTSbcqjWkXKGbC5hvV`
- Original slot: `441308645`
- Transaction class: `SYSTEM_TRANSFER`
- Eligibility: `SUPPORTED`
- Schema: `0.1`
- Backend: LiteSVM 0.15.2 / Agave 4.1.1

This directory is data, never executable script input. Validate integrity before replay:

```bash
solrepro inspect .
solrepro replay .
solrepro compare .
solrepro assert .
```

If eligibility is `UNSUPPORTED`, replay is intentionally refused. See `provenance.json` and the structured reason codes in `manifest.json`.
