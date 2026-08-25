# Deterministic failure regression

Signature: `mThLKQEAhXHzHxozzWm8ZnhX5YZoSprNfzV5zaMrRMh9UNweAYiwFNbNX2E5gfoWP5zu4pG5LrohSgb6awZ2mYo`

This bundle permanently asserts the mainnet failure `InsufficientFundsForRent { account_index: 0 }`. Expected fidelity is `EXACT`.

```bash
solrepro inspect ./examples/deterministic-failure/bundle
solrepro replay ./examples/deterministic-failure/bundle
solrepro assert ./examples/deterministic-failure/bundle --fresh
```
