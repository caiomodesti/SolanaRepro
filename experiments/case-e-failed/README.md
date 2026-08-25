# Case E — real failed mainnet transaction

Mainnet signature: `mThLKQEAhXHzHxozzWm8ZnhX5YZoSprNfzV5zaMrRMh9UNweAYiwFNbNX2E5gfoWP5zu4pG5LrohSgb6awZ2mYo`

Result: `EXACT`. Both original and replay fail with `InsufficientFundsForRent{account_index:0}`. All 6 logs, 450 CUs and compared post-balances match.

```bash
node src/cli.js assert artifacts/mThLKQEAhXHzHxozzWm8ZnhX5YZoSprNfzV5zaMrRMh9UNweAYiwFNbNX2E5gfoWP5zu4pG5LrohSgb6awZ2mYo/bundle --fresh
```
