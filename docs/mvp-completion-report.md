# MVP completion report

Date: 2026-08-25

## 1. What was implemented?

The feasibility spike was converted into a v0.1.0 product candidate with a strict transaction allowlist, provider-neutral historical evidence boundary, account-level provenance, fail-closed eligibility, portable Bundle v0.1, SHA-256 integrity, pinned LiteSVM replay, deterministic comparison, CI assertions, public examples, security controls, and complete project documentation.

The original feasibility reports, probes, captured transactions, and unsupported counterexamples were preserved.

## 2. Which commands work?

- `solrepro capture <signature> [--rpc <url>]`
- `solrepro inspect <bundle-or-signature>`
- `solrepro replay <bundle>`
- `solrepro compare <bundle> [replay.json]`
- `solrepro assert <bundle> [--fresh]`

All support human-readable output and the product commands support `--json` where machine output is needed. `assert` uses a non-zero exit code for a regression or unsupported/corrupted input.

## 3. Which transaction classes are supported?

- `SYSTEM_TRANSFER`
- `CLASSIC_SPL_TRANSFER`, narrowly validated classic Token transfer/TransferChecked only
- `SUPPORTED_DETERMINISTIC_FAILURE`, currently the proven System failure class

The three committed real-mainnet examples reproduce locally as `EXACT`.

## 4. Which cases remain unsupported?

ALT historical state, complex CPI/DeFi, Token-2022, oracles/temporal dependencies, unknown classes, unresolved historical program versions, runtime mismatches, and any relevant account whose pre-state is only `CURRENT_ONLY` or `UNKNOWN`.

## 5. What fidelity guarantees exist?

For an eligible bundle, the comparator checks success/failure, canonical error, normalized logs, compute units, writable lamport effects, classic SPL token effects, inner instructions, and return data. Outcomes are deterministic: `EXACT`, `SEMANTIC_MATCH`, `PARTIAL`, `DIVERGENT`, or `UNSUPPORTED`. A replay match can never upgrade an ineligible bundle.

`EXACT` is scoped to the comparator contract and pinned local backend. It does not claim the local process is the historical validator binary or that arbitrary historical mainnet state was recreated.

## 6. How does state provenance work?

Every relevant account is classified `PROVEN`, `INFERRED`, `CURRENT_ONLY`, or `UNKNOWN`, with source, slot context, evidence, and limitations. The `HistoricalStateProvider` contract separates capture from providers. `StandardRpcProvider` explicitly declares no arbitrary historical account-state capability; `FixtureProvider` and `SnapshotProvider` provide explicit immutable inputs. Future archive/custom adapters can implement the contract without changing the trust rule.

Relevant `CURRENT_ONLY` or `UNKNOWN` inputs force `UNSUPPORTED`. Current RPC state is never relabeled as historical state.

## 7. Do all tests pass?

Yes, locally on this Windows checkout:

- Node test runner: 19 passed, 0 failed.
- Supported corpus: System transfer `EXACT`, classic SPL transfer `EXACT`, deterministic failure `EXACT`.
- Negative corpus: ALT `UNSUPPORTED`, CPI provenance `UNSUPPORTED`.
- Rust workspace tests/build: passed with the pinned MSVC toolchain.
- `npm run test:ci`: passed when invoked through the valid Node/npm installation.

The global `npm` shim on this machine points to a missing roaming npm module. This is an environment-path defect, not a repository failure; invoking `C:\Program Files\nodejs\node.exe` with the installed npm CLI succeeds.

## 8. Did CI actually pass on GitHub?

**No.** A local baseline commit is being prepared, but this checkout has no configured remote. `gh auth status` reports an invalid token. The workflow is implemented but has not run remotely. No remote-CI badge or success claim is justified.

## 9. Do the public examples work?

Yes locally. Each example contains its mainnet signature, explanation, Bundle v0.1, replay/assert commands, expected result, explicit provenance, integrity metadata, and generated replay/comparison output.

## 10. What limitations remain?

- Standard RPC cannot return arbitrary account bytes at an original slot.
- Historical feature activation, sysvars, program deployments, and validator binary are not generally reconstructed.
- Archive-provider and production snapshot parsers are architectural follow-ons, not MVP integrations.
- Cross-platform behavior has not yet been observed from a remote clean clone.
- Bundle hashes provide integrity, not creator authentication.
- The public benchmark is three supported examples, not a coverage-rate claim.

## 11. Is the project ready for v0.1.0?

The code and local evidence form a credible v0.1.0 **release candidate**, but release is blocked by the explicit gate requiring a published commit and real GitHub Actions pass. No tag or package should be published yet.

## 12. Is it technically ready for a grant application?

**Conditional yes.** The problem, thesis, architecture, exact examples, negative evidence, security posture, roadmap, and measurable local results are technically grant-ready. A submission should wait for a public repository URL and remote CI evidence so reviewers can reproduce the claims from a clean checkout.

## Final decision

**MVP NOT READY**

Objective reason: every local engineering acceptance criterion is satisfied, but the Master Prompt's Definition of Done explicitly requires GitHub CI passing remotely and a cloneable repository. Neither can be proven without a configured remote and valid GitHub authentication.
