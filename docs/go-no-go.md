# Decision: CONDITIONAL GO

## Direct answers

1. **Is it technically possible?** Yes, for a definable subset. No, for arbitrary transactions from signature alone.
2. **What reproduced?** Successful SOL transfer, successful classic SPL transfer, and a real failed SOL transfer. All three matched result/error, logs, CUs, compared balances and return data exactly.
3. **What did not reproduce?** The v0 + four-ALT transaction and Pump AMM CPI transaction were captured but rejected because historical pre-state was not defensible.
4. **Backend?** Rust LiteSVM `0.15.2` with an exactly pinned Agave `4.1.1` dependency family. Add Agave/test-validator later as a differential backend.
5. **Need archive RPC?** For older transaction/ledger metadata, probably yes operationally. It still does not solve arbitrary historical account state through standard RPC.
6. **Can historical account state be recovered?** Not arbitrarily through standard `getAccountInfo`/`getMultipleAccounts`. Only partial state can be inferred from transaction metadata: all lamport pre/post balances and selected token amounts, not full bytes.
7. **Principal blocker?** Provenance-complete historical pre-state, followed by historical program/runtime/feature/sysvar fidelity.
8. **Safe MVP scope?** Eligibility-gated legacy/v0 transactions whose complete relevant pre-state is derivable or supplied with provenance; start with System empty-data accounts, narrowly validated classic SPL transfers, immutable/builtin programs, no time/oracle/epoch dependence, and no unknown writable data.
9. **Is “turn mainnet transactions into regression tests” defensible?** Only with the qualifier “supported transactions.” Unqualified marketing would be false.
10. **Verdict?** **CONDITIONAL GO.**

## MVP acceptance boundary

A bundle is supported only if all of the following hold:

- raw transaction and original metadata are available;
- every writable account has exact or transaction-derivable pre-state;
- every external program binary is immutable or historically proven;
- all ALT contents required to sanitize/load the transaction are proven;
- required sysvars/features/runtime configuration are known or the transaction is demonstrably insensitive to them;
- replay passes at least result/error equality; claimed `EXACT` additionally passes every committed comparator check.

Initial allowlist:

- System Program transfers between empty-data System accounts;
- deterministic failed variants of the same;
- classic SPL Token transfers only when transaction metadata includes pre/post token balances and the account-layout/invariance assumptions are explicit;
- builtin/standard programs covered by the pinned backend.

Initial denylist:

- arbitrary DeFi, oracle/time/epoch/stake/vote logic;
- upgraded programs without historical ELF provenance;
- closed or current-only writable accounts;
- unknown Token-2022 extensions;
- v0/ALT cases without historical ALT and account fixtures.

## Stop/go gate for a real product

Proceed only with the eligibility-gated MVP and honest `UNSUPPORTED` output. Do not invest in a universal capture/replay architecture until a reliable historical full-account and program-version source has been proven on the C/D/F corpus.
