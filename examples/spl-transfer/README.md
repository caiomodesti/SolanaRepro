# Classic SPL transfer regression

Signature: `3JDNbXB5Wwp9h9ocqMFxcPXAU3kN8KNrvJgiL8ksieWFk43rfAYDzAWSndzqtsR4vC1GckbotLtoG75jPUV8BNfv`

This TransferChecked bundle uses only transaction-derived classic SPL fixtures: three inputs are `PROVEN`, three are `INFERRED`, and none are `CURRENT_ONLY`. Expected fidelity is `EXACT`.

```bash
solrepro inspect ./examples/spl-transfer/bundle
solrepro replay ./examples/spl-transfer/bundle
solrepro assert ./examples/spl-transfer/bundle --fresh
```
