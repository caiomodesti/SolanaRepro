# Case A — System Program transfer

Mainnet signature: `2aCEdK4E5AbJoqBXay31frSRQC2BWxwjqqWiJ9r5m6WFTPZSQsXfZ3HbF3YHX6TQFF32kJrTSbcqjWkXKGbC5hvV`

Result: `EXACT`. Success/error, 6 log lines, 450 CUs, return data and all compared writable post-balances match. Historical lamports come from transaction metadata; both user accounts are System-owned with empty data.

Run:

```bash
node src/cli.js assert artifacts/2aCEdK4E5AbJoqBXay31frSRQC2BWxwjqqWiJ9r5m6WFTPZSQsXfZ3HbF3YHX6TQFF32kJrTSbcqjWkXKGbC5hvV/bundle --fresh
```
