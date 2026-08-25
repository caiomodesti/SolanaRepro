# Case C — versioned transaction with ALTs

Mainnet signature: `5MEcdGqvxFnTY82f61nj1LHHycUpMvzWC5X9eSBYedbJpd7Qa7XncjvPZakBbSFE7LoV4rhU7HtJJB8K4V1WqrwJ`

Capture: v0, 61 resolved accounts, 4 Address Lookup Tables, 126,857 CUs. Replay: deliberately `UNSUPPORTED`; 20 writable or unavailable accounts lack historical pre-state. The wire transaction, resolved loaded addresses, ALT descriptors, program/account inventory and expected effects remain captured as evidence.

```bash
node src/cli.js replay artifacts/5MEcdGqvxFnTY82f61nj1LHHycUpMvzWC5X9eSBYedbJpd7Qa7XncjvPZakBbSFE7LoV4rhU7HtJJB8K4V1WqrwJ/bundle
```
