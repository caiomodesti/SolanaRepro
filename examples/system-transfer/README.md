# System transfer regression

Signature: `2aCEdK4E5AbJoqBXay31frSRQC2BWxwjqqWiJ9r5m6WFTPZSQsXfZ3HbF3YHX6TQFF32kJrTSbcqjWkXKGbC5hvV`

This bundle reproduces a successful System Program transfer. All four relevant inputs are `PROVEN`; expected fidelity is `EXACT`.

```bash
solrepro inspect ./examples/system-transfer/bundle
solrepro replay ./examples/system-transfer/bundle
solrepro assert ./examples/system-transfer/bundle --fresh
```
