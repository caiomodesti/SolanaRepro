# Agentic Engineering Grant application draft

Submission page: https://superteam.fun/earn/grants/agentic-engineering

This draft requests support for the next bounded phase. The already completed v0.1 MVP is proof of work, not work retroactively attributed to the grant.

## Step 1: Basics

**Project Title**

> SolanaRepro

**One Line Description**

> Open-source forensic transaction reproduction infrastructure that turns supported Solana mainnet incidents into verifiable local reproductions and portable regression tests.

**TG username**

> [REQUIRED — replace with t.me/username]

**Wallet Address**

> [REQUIRED — replace with a Solana wallet controlled by the applicant]

## Step 2: Details

**Project Details**

> Solana developers can execute transactions locally, but local execution alone does not prove that the supplied accounts, programs, and environment represent the original historical mainnet context. Standard RPC returns transaction metadata and current account state, not arbitrary historical account bytes at a requested slot. This makes it easy for debugging tools to produce a convincing replay from indefensible inputs.
>
> SolanaRepro adds an evidence and eligibility layer above local runtimes. It discovers available historical context, records account-level provenance, refuses replay when material inputs are insufficient, constructs a portable bundle, replays through a pinned LiteSVM/Agave backend, and deterministically compares the local result with the original execution. The v0.1 MVP has three real-mainnet cases classified `EXACT` and two difficult ALT/CPI cases correctly classified `UNSUPPORTED`.
>
> The proposed grant phase will turn the provider seam into a tested public contract: harden fixture and snapshot inputs, implement provider conformance tests, evaluate one real archive-provider adapter without vendor-coupling the core, and prepare the first benchmark corpus. The goal is not to maximize a superficial support percentage. It is to increase defensible coverage while preserving zero known false-positive `SUPPORTED` classifications.

**Deadline**

> 2026-10-08 23:59 IST (proposed; confirm before submission)

**Proof of Work**

> Public repository: https://github.com/caiomodesti/SolanaRepro
>
> Verified Linux CI: https://github.com/caiomodesti/SolanaRepro/actions/runs/32924377044
>
> The v0.1 implementation includes `capture`, `inspect`, `replay`, `compare`, and `assert`; Bundle v0.1 with SHA-256 integrity; provider-neutral `HistoricalStateProvider`; fail-closed provenance; 19 automated tests; three public `EXACT` regression bundles; and explicit ALT/CPI `UNSUPPORTED` evidence. A fresh Windows clone and published Linux GitHub Actions runs passed the complete corpus.

**Personal X Profile**

> [REQUIRED — replace with x.com/handle]

**Personal GitHub Profile**

> https://github.com/caiomodesti

**Colosseum Crowdedness Score**

> [REQUIRED — obtain the current score with Colosseum Copilot, capture the result, upload it to a publicly accessible location, and paste the link]

**AI Session Transcript**

> Local file prepared: `codex-session.jsonl`. Review it for secrets and personal information before attaching it to a form. It is intentionally excluded from Git.

## Step 3: Milestones

**Goals and Milestones**

> Milestone 1 — 2026-09-10: publish the HistoricalStateProvider capability/conformance specification and tests covering slot identity, source identity, missing historical state, and current-state rejection.
>
> Milestone 2 — 2026-09-24: harden FixtureProvider and SnapshotProvider with immutable-source manifests and negative provenance tests.
>
> Milestone 3 — 2026-09-30: complete an evidence-backed feasibility evaluation of one archive-provider adapter without coupling the core to a vendor or claiming unsupported history.
>
> Milestone 4 — 2026-10-08: publish the first 25-case benchmark slice with real mainnet transactions, machine-generated fidelity classifications, structured unsupported reasons, and a final technical report.

**Primary KPI**

> At least 25 published real-mainnet benchmark cases with reproducible provenance classifications and zero known false-positive `SUPPORTED` outcomes by 2026-10-08.

**Final tranche checkbox**

> Confirmed: the final tranche requires the shipped project URL, public GitHub repository, and eligible AI subscription receipt(s). Verify the live form requirements again at submission time.

## Required applicant inputs before submission

- Telegram username.
- Solana wallet address.
- Personal X profile.
- Confirmation of the proposed deadline.
- Current Colosseum crowdedness result and public screenshot link.
- Privacy review of `codex-session.jsonl`.
- Eligible AI subscription receipt(s), retained privately.

Do not place wallet secrets, access tokens, RPC credentials, KYC documents, or receipts in the public repository.
