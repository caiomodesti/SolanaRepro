# Solana Foundation grant readiness

Assessment date: 2026-08-27

Decision: **CONDITIONAL GO** for the Solana Foundation Funding Program under
`Developer Tooling`.

This is the general Solana Foundation milestone-based funding application. It
is not the fixed 200 USDG Agentic Engineering Grant, and it does not request an
AI transcript or AI subscription receipts.

## Why SolanaRepro fits

| Foundation criterion | Current evidence | Assessment |
| --- | --- | --- |
| Public good | Free forensic transaction-reproduction CLI and portable bundles for Solana developers | Strong fit |
| Open source | Public Apache-2.0 repository and public `v0.1.0` release | Strong fit |
| Solana-specific | Historical account/program provenance, SVM replay, Solana transaction classes and runtime pinning | Strong fit |
| Proof of concept | Three real-mainnet `EXACT` cases and two explicit `UNSUPPORTED` counterexamples | Strong fit |
| Clear use of funds | Staged provider, benchmark and portable-distribution roadmap with measurable gates | Strong fit |
| Track record | Public code, CI and release evidence exist; broader applicant experience still needs to be written | Partial |
| Existing traction | No independent review report or third-party integration has been recorded yet | Weak/current gap |

## Verified public evidence

- Repository: https://github.com/caiomodesti/SolanaRepro
- Release: https://github.com/caiomodesti/SolanaRepro/releases/tag/v0.1.0
- Independent review request: https://github.com/caiomodesti/SolanaRepro/issues/1
- Phase 2 provider-conformance work remains isolated in draft PR #2:
  https://github.com/caiomodesti/SolanaRepro/pull/2
- The published release passed Linux GitHub Actions and a prior clean Windows
  clone.
- On 2026-08-27, the maintainer clean-review harness independently cloned the
  immutable `v0.1.0` target into an empty temporary directory and returned
  `PASS`: clean worktree, no initial `node_modules`, no initial `target`, cold
  native build, Rust tests, three `EXACT`, two `UNSUPPORTED`, and 19/19 Node
  tests. Time to first completed regression was 723,520 ms (12m03.520s); total
  duration was 729,656 ms (12m09.656s). This is maintainer validation, not an
  independent third-party review. A privacy-safe evidence summary is committed
  at
  [`artifacts/evaluation/clean-review-v0.1.0-windows-2026-08-27.summary.json`](../artifacts/evaluation/clean-review-v0.1.0-windows-2026-08-27.summary.json).

## Submission gate

Prepare the application now, but submit only after the current external
evaluation window closes or its exit gate is satisfied:

1. Publish the clean-review harness and obtain reproducible reviewer runs.
2. Record at least two independent reports; if reviewers do not participate by
   the target date, disclose that as an adoption gap instead of implying review.
3. Resolve any critical false-positive or bundle-integrity finding.
4. Put the technical proposal in a shared, viewable Google Doc using the exact
   Developer Tooling template.
5. Confirm the funding request and applicant identity/contact fields.

The absence of traction does not make the project ineligible, but it should be
stated plainly in the `Relevant metrics` answer.

## Form values already determined

- Company name: `SolanaRepro`
- Website URL: `https://github.com/caiomodesti/SolanaRepro`
- Solana On-Chain Accounts: `N/A` (the current product is off-chain developer
  tooling and does not deploy a program, token or project fee-payer wallet)
- Funding category: `Developer Tooling`
- Open source: `Yes`
- Recommended provisional request: `$30,000 USD`, subject to applicant approval
  and final milestone costing

## Applicant inputs still required

- Legal first and last name.
- Primary country of operations.
- Project email address.
- Telegram and/or X contact.
- Relevant personal delivery history, Solana experience and any recognized
  hackathon work.
- Confirmation or revision of the provisional `$30,000 USD` request.

## Privacy boundary

`codex-session.jsonl` was prepared locally and remains ignored by Git. It is not
required by this Solana Foundation application and should not be uploaded to the
form. If it is ever used for another program, it requires a secrets and personal
information review first.

No application has been submitted and no personal data has been entered into
the Foundation form.
