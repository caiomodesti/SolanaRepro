# Solana Repro bundle

- Signature: `54b9hP8NQgRJmEss1SR4CnoNDJadymC7JavnKE773pF1WXGanrtpAX2grrd2tDPWEn9aDFiWcogYV9B46uHuVmpB`
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
