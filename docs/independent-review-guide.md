# Independent review guide

## Review objective

Determine whether SolanaRepro v0.1 makes only evidence-supported reproduction claims and fails closed when historical provenance is insufficient. This is a source and reproducibility review, not a request to endorse universal Solana replay.

## Review target

- Repository: https://github.com/caiomodesti/SolanaRepro
- Release: `v0.1.0`
- Runtime: Node.js 22+, Rust stable, native build toolchain; Windows uses `stable-x86_64-pc-windows-msvc`
- Expected effort: 30-90 minutes for the standard path

Record the commit SHA and environment used. Do not review an uncommitted working tree as if it were the release.

## Standard reproduction path

```bash
git clone https://github.com/caiomodesti/SolanaRepro.git
cd SolanaRepro
git checkout v0.1.0
npm ci --ignore-scripts
cargo build --locked -p repro-replay
npm run test:ci
```

On Windows PowerShell, use the repository build script instead of the generic Cargo line:

```powershell
.\scripts\build-replay.ps1
cargo +stable-x86_64-pc-windows-msvc test --locked --workspace
```

Expected aggregate result:

- Node tests: 19 passed, 0 failed.
- System transfer: `EXACT`.
- Classic SPL transfer: `EXACT`.
- Deterministic failure: `EXACT`.
- ALT historical-state case: `UNSUPPORTED`.
- Complex CPI provenance case: `UNSUPPORTED`.

Windows native builds require a compatible Perl installation for the pinned OpenSSL dependency. The first clean Windows build may take approximately ten minutes. The Windows GNU host is not a supported substitute for the documented MSVC path.

## Adversarial checks

Reviewers are encouraged to try the following without weakening bundle validation:

1. Modify a hashed bundle file and confirm integrity validation fails.
2. Remove required provenance and confirm replay is refused.
3. Introduce a runtime mismatch and confirm it cannot become `EXACT`.
4. Change expected error, logs, compute units, lamport effects, or token effects and confirm the comparator detects the divergence.
5. Inspect ALT/CPI negative cases and determine whether any historical input is being silently replaced with current RPC state.
6. Review readonly inputs and confirm relevance, rather than writability alone, controls provenance requirements.
7. Attempt malformed paths, symlinks, oversized files, or missing bundle files within a disposable clone.

## Claims to evaluate

| Claim | Acceptance evidence |
| --- | --- |
| Supported real-mainnet examples reproduce locally | Three committed cases return `EXACT` under the documented comparator |
| Insufficient provenance fails closed | ALT and CPI cases return structured `UNSUPPORTED` reasons before replay |
| Bundles detect accidental modification | SHA-256 manifest validation rejects changed required files |
| Results are suitable for CI regression | `solrepro assert` returns CI-appropriate exit codes |
| Capture is provider-neutral | Core capture depends on `HistoricalStateProvider`, not a vendor-specific archive API |

## Claims that must be rejected

- “Reproduces any Solana transaction.”
- “Recreates exact historical account state for every slot.”
- “Bit-for-bit historical validator reproduction.”
- “ALT, complex CPI, DeFi, Token-2022, or oracle history is supported in v0.1.”

## Reviewer scorecard

Score each dimension from 0 to 2 and explain every zero:

| Dimension | 0 | 1 | 2 |
| --- | --- | --- | --- |
| Reproducibility | Cannot run | Runs with undocumented workarounds | Documented clean run |
| Provenance integrity | Unsafe acceptance | Ambiguous boundary | Fail-closed and traceable |
| Comparator honesty | Material false match | Incomplete but disclosed | Claims match evidence |
| Bundle security | Trivial bypass | Partial validation | Required checks hold |
| Documentation | Misleading | Incomplete | Scope and non-claims are clear |
| Developer usefulness | No credible workflow | Narrow but awkward | Useful incident-to-CI path |

Suggested decision:

- `GO`: no material false-positive path found; claims match the tested scope.
- `CONDITIONAL GO`: useful but a specific fix is required before broader use.
- `NO-GO`: a supported result can be produced from indefensible inputs or a material divergence is hidden.

## Report a review

Open an [independent review issue](https://github.com/caiomodesti/SolanaRepro/issues/new?template=independent-review.yml) and include:

- commit and operating system;
- commands executed;
- raw aggregate result;
- scorecard;
- any minimal reproduction for a finding;
- whether you consent to the review being cited publicly.

Do not include private RPC URLs, wallet secrets, access tokens, or unrelated machine data.
