# Grant evidence map

## Demonstrated locally

- Three real mainnet cases replay as `EXACT`: SOL transfer, classic SPL transfer, and deterministic System failure.
- ALT and complex CPI examples fail closed as `UNSUPPORTED` with stable reason codes.
- Bundle v0.1 records account-level provenance, runtime pins, original evidence, and SHA-256 integrity.
- The CLI exposes capture, inspect, replay, compare, and assert with human and JSON output.
- Automated tests cover corruption, traversal, runtime mismatch, outcome classification, and the committed replay corpus.
- A fresh Windows clone of commit `ffbd0b3` installed, built from an empty target directory, and passed the complete corpus; cold native build time was 9m59s.
- Public commit `1abbdf3` passed the complete Linux workflow in GitHub Actions run [`32924089225`](https://github.com/caiomodesti/SolanaRepro/actions/runs/32924089225): locked Rust tests, replay build, and `npm run test:ci`.

## Not yet demonstrated

- A tagged/reproducible release and install from a package registry.
- Archive-provider integration or arbitrary historical account reconstruction.
- A public approximately 100-transaction benchmark.
- Support for ALT, complex CPI, DeFi, Token-2022, or upgradeable historical program bytes.

Any grant application should link exact artifacts and preserve these boundaries. Local and GitHub CI evidence is not production, mainnet-wide, archive-state, adoption, or third-party audit proof.
