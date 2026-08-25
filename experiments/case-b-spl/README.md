# Case B — classic SPL Token transfer

Mainnet signature: `3JDNbXB5Wwp9h9ocqMFxcPXAU3kN8KNrvJgiL8ksieWFk43rfAYDzAWSndzqtsR4vC1GckbotLtoG75jPUV8BNfv`

Result: `EXACT` for the committed effects: success/error, 3 logs, 105 CUs, lamports and token amounts. The pre-token amounts are historical metadata, but remaining account bytes come from a later current-layout snapshot. The manifest exposes that assumption; this is not general historical-state recovery.

```bash
node src/cli.js assert artifacts/3JDNbXB5Wwp9h9ocqMFxcPXAU3kN8KNrvJgiL8ksieWFk43rfAYDzAWSndzqtsR4vC1GckbotLtoG75jPUV8BNfv/bundle --fresh
```
