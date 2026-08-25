# Solana Repro bundle

- Signature: `3JDNbXB5Wwp9h9ocqMFxcPXAU3kN8KNrvJgiL8ksieWFk43rfAYDzAWSndzqtsR4vC1GckbotLtoG75jPUV8BNfv`
- Original slot: `441310827`
- Transaction class: `CLASSIC_SPL_TRANSFER`
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
