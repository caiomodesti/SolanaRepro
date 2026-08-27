# Independent reviewer outreach kit

Target window: 2026-08-28 through 2026-09-10

Objective: obtain at least three independent attempts and at least two
reproducible reports for the frozen `v0.1.0` release. A negative review is valid
evidence. Silence or inability to recruit reviewers is an adoption gap, not a
successful evaluation.

## Reviewer profiles

Invite at least one person from each group:

1. Solana runtime or transaction tooling engineer.
2. Application-security researcher or Solana auditor.
3. Solana program developer who regularly investigates failed mainnet
   transactions.

Do not count the maintainer, an AI agent acting for the maintainer, or a person
who did not run or inspect the protocol as an independent reviewer.

## Short invitation — English

> I am looking for an adversarial independent review of SolanaRepro v0.1.0, an
> open-source tool that turns a narrowly supported subset of real Solana mainnet
> transactions into provenance-checked local reproductions and regression
> artifacts. The project deliberately returns UNSUPPORTED when historical
> evidence is insufficient. I am not asking for an endorsement. I want you to
> try to break the provenance boundary, bundle integrity, comparator or clean
> installation workflow and publish a GO, CONDITIONAL GO or NO-GO report. The
> expected effort is 30-90 minutes plus the first native build. Review protocol:
> https://github.com/caiomodesti/SolanaRepro/blob/codex/external-evaluation-harness/docs/independent-review-guide.md
> Report here:
> https://github.com/caiomodesti/SolanaRepro/issues/new?template=independent-review.yml

## Short invitation — Portuguese

> Estou buscando uma avaliação técnica independente e adversarial do
> SolanaRepro v0.1.0, uma ferramenta open-source que transforma um subconjunto
> deliberadamente restrito de transações reais da mainnet Solana em reproduções
> locais com proveniência e artefatos de regressão. Quando a evidência histórica
> é insuficiente, o resultado correto é UNSUPPORTED. Não estou pedindo endosso:
> quero que você tente quebrar a fronteira de proveniência, a integridade do
> bundle, o comparador ou a instalação limpa e publique uma decisão GO,
> CONDITIONAL GO ou NO-GO. Esforço esperado: 30-90 minutos mais o primeiro build
> nativo. Protocolo:
> https://github.com/caiomodesti/SolanaRepro/blob/codex/external-evaluation-harness/docs/independent-review-guide.md
> Relatório:
> https://github.com/caiomodesti/SolanaRepro/issues/new?template=independent-review.yml

## Exact review checkout

Until PR #3 is merged, the measurement harness lives on its review branch but
always clones and verifies the frozen `v0.1.0` release:

```bash
git clone --branch codex/external-evaluation-harness https://github.com/caiomodesti/SolanaRepro.git
cd SolanaRepro
node scripts/measure-clean-review.js
```

The harness refuses the run before installation when the default tag does not
resolve to commit `12dd8f85465097a4e1f0917d1de3e8d116afb1da`, the checkout is
dirty, or `node_modules`/`target` already exists. Reviewers should inspect the
JSON before publishing it because the full report contains local filesystem
paths and bounded command output.

## Minimum valid report

- Reviewer identity or stable public handle and relationship disclosure.
- Exact release/commit and operating system/tool versions.
- Exact commands or the clean-review JSON.
- Aggregate corpus result and test result.
- Six-dimension scorecard from the review guide.
- `GO`, `CONDITIONAL GO` or `NO-GO` decision.
- Minimal reproduction for every material finding.
- Explicit consent if the report may be quoted in a grant application.

Repository stars, private messages saying “looks good,” automated AI-only
reviews and maintainer-run results do not satisfy the independent-review gate.

## Triage response times

| Severity | Definition | Initial response target |
| --- | --- | --- |
| Critical | Indefensible input can become `SUPPORTED`/`EXACT`, or required bundle integrity can be bypassed | 24 hours |
| High | Material divergence is hidden or a documented security boundary fails | 48 hours |
| Medium | Reproducibility, portability or documentation defect without a false-positive support result | 3 business days |
| Low | Usability, wording or non-material maintenance issue | 7 days |

Critical and high findings block the external-evaluation exit gate until fixed
and independently reproduced.
