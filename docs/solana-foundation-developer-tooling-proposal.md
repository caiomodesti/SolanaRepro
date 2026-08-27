# Developer Tooling Grant Proposal

Solana Foundation — application working draft

Status: draft; do not submit until the external-evaluation gate and applicant
fields in brackets are resolved.

# 1. Applicant Information

**Project / Tool Name**

SolanaRepro

**Applicant / Organization**

[LEGAL APPLICANT OR ORGANIZATION NAME]

**Primary Contact (name, email, Telegram/X)**

[LEGAL NAME] — [PROJECT EMAIL] — [TELEGRAM AND/OR X]

**Total Amount Requested (USD)**

$30,000 (provisional; applicant confirmation required)

**Relevant Experience & Track Record**

The applicant has already designed, implemented and publicly released
SolanaRepro v0.1.0 rather than asking the Foundation to fund an untested idea.
The release includes an evidence-bounded command-line workflow, portable bundle
format, SHA-256 integrity verification, a pinned LiteSVM/Agave replay backend,
automated comparison and CI assertions. Its public corpus contains three real
mainnet cases classified `EXACT` and two difficult ALT/CPI cases deliberately
classified `UNSUPPORTED`.

The public repository and release history demonstrate delivery of code,
documentation, adversarial tests, Windows and Linux validation, and explicit
security/limitations documents. [ADD ONLY VERIFIED PERSONAL SOLANA, SECURITY,
STARTUP OR HACKATHON EXPERIENCE HERE.]

# 2. Overview of Ecosystem Impact

**How is this project a public good for the Solana community?**

Solana developers can execute transactions locally, but local execution alone
does not prove that the supplied accounts, program bytes and environment match
the original historical mainnet context. Standard RPC does not expose arbitrary
historical account bytes at a requested old slot. This creates a risk of
convincing but indefensible incident reproductions.

SolanaRepro is completely public and open-source forensic transaction
reproduction infrastructure. It discovers available context, records
account-level provenance, refuses replay when material history is insufficient,
constructs a portable artifact, replays through a pinned local backend and
compares the result with the original execution. The project favors one exact
reproduction over ten misleading partial ones. Its formats, evidence rules,
benchmark and CI workflow will remain available for other Solana teams to use
and extend.

**Specific benefits to Solana developers**

- Turn a supported production incident into a deterministic local regression.
- Share a self-verifying bundle with maintainers, auditors and security teams.
- Detect when a historical-state claim is unsupported before local execution
  creates false confidence.
- Compare outcome, normalized logs, compute units and relevant balance/token
  effects under explicit semantics.
- Add the preserved incident to CI so a later code or runtime change cannot
  silently reintroduce it.
- Evaluate historical-state sources through one vendor-neutral conformance
  contract.

# 3. Product Design

**Architecture & how it works**

The pipeline is:

`historical transaction -> state discovery -> provenance -> reconstruction -> replay -> comparison -> forensic report / regression assertion`

Capture and inspection depend on a provider-neutral `HistoricalStateProvider`.
Each provider declares slot semantics, source identity and evidence capability.
The core validates provider and account responses before bundle construction.
Current-only RPC observations can never be promoted into proven historical
state. Missing, unverifiable or inconsistent history returns a structured
`UNSUPPORTED` result.

Supported inputs are serialized into Bundle v0.1 with transaction evidence,
accounts, program bytes, runtime pins, original-execution evidence, provenance
and a SHA-256 manifest. A Rust backend executes the transaction in pinned
LiteSVM/Agave dependencies. The comparator produces `EXACT`,
`SEMANTIC_MATCH`, `PARTIAL` or `UNSUPPORTED` from explicit machine rules;
v0.1 ships support claims only for its `EXACT` subset.

**Key features**

- `capture`, `inspect`, `replay`, `compare`, `assert` and `bundle` CLI flows.
- Fail-closed provenance eligibility and stable unsupported reason codes.
- Provider-neutral historical-state abstraction.
- Portable, integrity-checked reproduction bundles.
- Pinned local runtime and deterministic comparison.
- Human-readable forensic output plus JSON output and CI exit codes.
- Public corpus and benchmark methodology that preserves unsupported cases in
  the denominator.

**Integration into existing developer workflows**

SolanaRepro does not replace LiteSVM, Mollusk, Agave or local fork tools. It
turns supported real mainnet incidents into trusted, portable inputs for local
execution and regression systems. Teams can commit a verified bundle beside a
bug fix, run `solrepro assert` in CI and share the same artifact with an auditor
or runtime maintainer. A later grant milestone packages this flow as a reusable
GitHub Action without changing the evidence rules.

**Technology stack**

- Node.js 22+ ES modules for capture, provenance, bundles, comparison and CLI.
- Rust stable for the native replay backend.
- LiteSVM 0.15.2 with pinned Agave/Solana dependency graph.
- JSON Bundle v0.1 artifacts with SHA-256 integrity manifests.
- GitHub Actions for locked Linux builds, tests and regression execution.

**Proof-of-Concept**

- Repository: https://github.com/caiomodesti/SolanaRepro
- Release: https://github.com/caiomodesti/SolanaRepro/releases/tag/v0.1.0
- Independent review protocol:
  https://github.com/caiomodesti/SolanaRepro/blob/v0.1.0/docs/independent-review-guide.md

# 4. Budget Breakdown (Milestones)

The completed v0.1.0 release is proof of work and is not billed retroactively.
All proposed payments are tied to future public deliverables and measurable
acceptance criteria already ordered by the project execution plan.

## 4a. Completed First Version (Beta) — per component

**Milestone 1 — Production historical-state providers — $6,000**

Target: 2026-10-08.

Deliver a production snapshot parser and one archive-provider reference adapter
behind the existing vendor-neutral contract. Every response must expose source
identity and slot semantics. Missing or unverifiable history must produce
`UNSUPPORTED`. Acceptance requires immutable-source validation, adversarial
tests and at least ten real historical-state cases, including negative cases.
No vendor integration qualifies if real slot-specific account state cannot be
validated.

**Milestone 2 — Public approximately 100-transaction benchmark — $5,000**

Target: 2026-11-20.

Publish a reproducibly selected and deduplicated corpus of approximately 100
real mainnet transactions. For every case, publish transaction class, provider,
provenance class, runtime, fidelity result, structured reason and replay time.
The benchmark must preserve the denominator and report `EXACT`,
`SEMANTIC_MATCH`, `PARTIAL` and `UNSUPPORTED` separately using machine-generated
classification rules.

**Milestone 3 — Portable release and regression Action — $4,000**

Target: 2026-12-18.

Publish CI-generated CLI artifacts for supported operating systems, checksums,
release provenance and smoke tests; stabilize the bundle pack/verify workflow;
and publish a reusable GitHub Action for regression assertions. Unsupported
platforms must be explicit. Acceptance requires clean-machine verification
without compiling the native backend on every supported platform.

**Milestone 4 — v1 evidence and response policy — $5,000**

Target: 2027-01-15.

Publish the stable provider contract, bundle migration policy, measured
corpus-bounded coverage, at least two independent technical reviews, and a
documented response process for an incorrect `SUPPORTED` classification. This
milestone may not claim universal transaction reproduction and cannot complete
with a known false-positive supported outcome.

Beta/product-development subtotal: **$20,000**.

## 4b. Maintenance — minimum 6 months

Maintenance period: 2027-01-16 through 2027-07-15.

Total maintenance budget: **$6,000**, paid as six monthly milestones of
**$1,000**.

Each month includes public issue triage, reproducible bug investigation,
security and integrity fixes, dependency advisories, CI/release maintenance,
documentation corrections and transparent handling of any incorrect support
classification. A monthly milestone requires a public maintenance log and no
unaddressed critical false-positive or bundle-integrity report older than the
published response window.

## 4c. User Adoption

Adoption subtotal: **$4,000**. Metrics are opt-in and publicly verifiable; no
private repository analytics or fabricated activity will be counted.

**Adoption milestone A — Independent reproducibility — $2,000**

Target: at least 20 successful third-party clean-review or bundle-reproduction
reports from at least five independent identities by 2027-07-15. Reports must
name the immutable release/commit, environment and machine-verifiable result.
For each 25% of the target reached, 25% of this milestone becomes eligible.

**Adoption milestone B — Project integrations — $2,000**

Target: at least four independent public Solana repositories using a verified
SolanaRepro bundle or the regression GitHub Action in CI by 2027-07-15. Each
integration must link to a public workflow/run and a real incident or regression
case. For each integration (25% of target), 25% becomes eligible.

## Milestone Summary Table

| # | Milestone / Deliverable | Success Criteria | Amount (USD) |
| --- | --- | --- | ---: |
| 1 | Production historical-state providers | Snapshot parser, reference archive adapter, adversarial tests and >=10 real cases with fail-closed semantics | $6,000 |
| 2 | Public benchmark | Approximately 100 deduplicated real cases with machine-generated classifications and preserved denominator | $5,000 |
| 3 | Portable distribution | CI-built artifacts, checksums, smoke tests, pack/verify and reusable GitHub Action | $4,000 |
| 4 | v1 evidence and response policy | Stable contracts, migrations, >=2 independent reviews, measured coverage and zero known false-positive support outcomes | $5,000 |
| 5-10 | Six monthly maintenance milestones | Public monthly log and issue/security/release maintenance | $6,000 |
| 11 | Independent reproducibility adoption | 20 valid reports from >=5 independent identities, paid proportionally per 25% | $2,000 |
| 12 | Public project integrations | Four public CI integrations, paid proportionally per 25% | $2,000 |

**Total: $30,000 USD.**

# 5. Acknowledgements

- [ ] The project will release a published production version by the end of the
  grant agreement. [APPLICANT CONFIRMATION REQUIRED]
- [ ] The project will be completely public and open-source. [APPLICANT
  CONFIRMATION REQUIRED]
- [ ] The team agrees to at least 6 months of maintenance. [APPLICANT
  CONFIRMATION REQUIRED]
- [ ] The team agrees to meet quantifiable user-adoption metrics. [APPLICANT
  CONFIRMATION REQUIRED]

# Form answer supplements

**Relevant metrics about the usage of your project/product**

As of 2026-08-27, SolanaRepro has one public source release, three published
real-mainnet `EXACT` regression bundles and two public `UNSUPPORTED`
counterexamples. The locked workflow has passed Windows clean-clone validation
and public Linux GitHub Actions. A maintainer-run clean review of the immutable
v0.1.0 release passed from empty dependency and native-build directories in
12m09.656s total. No independent review report or third-party project
integration has yet been recorded; the current external-evaluation phase is
designed to measure that adoption rather than infer it from repository activity.

**Competition**

LiteSVM, Mollusk and Agave provide execution, simulation or runtime primitives;
Surfpool provides a local Solana development environment and mainnet-fork
workflow. SolanaRepro operates above those layers. Its differentiation is the
evidence pipeline around a historical transaction: state discovery, provenance,
eligibility, reconstruction, replay comparison and a portable forensic or
regression artifact. The project does not claim to replace those tools. It turns
supported mainnet incidents into trusted inputs for them and refuses support
when historical provenance is insufficient.

**Why You?**

The applicant has demonstrated execution by shipping the public v0.1.0 release,
not merely a proposal. The implementation combines Solana transaction analysis,
historical-state threat modeling, provider-neutral architecture, native SVM
replay, integrity-checked portable artifacts and adversarial fail-closed tests.
The project's edge is methodological discipline: coverage is increased only
when provenance and comparison evidence remain defensible, and difficult cases
stay visible as `UNSUPPORTED`. [ADD VERIFIED PERSONAL EXPERIENCE, PRIOR SOLANA
WORK AND HACKATHON RECOGNITION BEFORE SUBMISSION.]
