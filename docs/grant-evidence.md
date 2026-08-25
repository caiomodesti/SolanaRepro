# Grant evidence map

## Demonstrated locally

- Three real mainnet cases replay as `EXACT`: SOL transfer, classic SPL transfer, and deterministic System failure.
- ALT and complex CPI examples fail closed as `UNSUPPORTED` with stable reason codes.
- Bundle v0.1 records account-level provenance, runtime pins, original evidence, and SHA-256 integrity.
- The CLI exposes capture, inspect, replay, compare, and assert with human and JSON output.
- Automated tests cover corruption, traversal, runtime mismatch, outcome classification, and the committed replay corpus.

## Not yet demonstrated

- A remote GitHub Actions pass from a published commit.
- A tagged/reproducible release and install from a package registry.
- Cross-platform results beyond this Windows checkout and the unexecuted Linux workflow definition.
- Archive-provider integration or arbitrary historical account reconstruction.
- A public approximately 100-transaction benchmark.
- Support for ALT, complex CPI, DeFi, Token-2022, or upgradeable historical program bytes.

Any grant application should link exact artifacts and preserve these boundaries. Local evidence is not production, mainnet-wide, or remote-CI proof.

