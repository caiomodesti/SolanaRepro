# Solana Repro bundle

- Signature: `5MEcdGqvxFnTY82f61nj1LHHycUpMvzWC5X9eSBYedbJpd7Qa7XncjvPZakBbSFE7LoV4rhU7HtJJB8K4V1WqrwJ`
- Original slot: `441308645`
- Transaction class: `UNSUPPORTED_TRANSACTION_CLASS`
- Eligibility: `UNSUPPORTED`
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
