# Solana Repro bundle

- Signature: `mThLKQEAhXHzHxozzWm8ZnhX5YZoSprNfzV5zaMrRMh9UNweAYiwFNbNX2E5gfoWP5zu4pG5LrohSgb6awZ2mYo`
- Original slot: `441309952`
- Transaction class: `SUPPORTED_DETERMINISTIC_FAILURE`
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
