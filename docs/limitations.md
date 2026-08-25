# Hostile audit: how the project breaks

| Limitation | Severity | Why it matters | Safe handling |
| --- | --- | --- | --- |
| No arbitrary historical full account bytes in standard RPC | **BLOCKER** | Most stateful transactions cannot reconstruct pre-state from a signature | Reject unless metadata fully determines state or a provenance-capable historical source supplies it |
| Account closed after original transaction | **BLOCKER** | Current RPC returns `null`; owner/data cannot be recovered | Reject; case D demonstrates this |
| Program upgraded/closed after original slot | **BLOCKER** | Current ProgramData `.so` may not be the executed code | Require immutable program or slot-proven executable archive |
| Historical feature set/runtime binary unknown | **MVP LIMITATION** | Loader, syscall, fee and execution semantics may differ | Pin backend; record observed RPC version; add slot-to-runtime/feature registry later |
| Clock, EpochSchedule, Rent and other sysvar divergence | **MVP LIMITATION** | Slot/time/epoch/rent branches can change result | Reject sysvar-sensitive transactions until exact sysvars are captured/reconstructed |
| Oracle-dependent programs | **BLOCKER** without historical oracle account | Current price bytes produce a different branch | Require historical oracle pre-state with provenance |
| ALT account history | **MVP LIMITATION** | Loaded addresses are returned, but table lifecycle/content and sanitization can be historical dependencies | Capture descriptors/resolved keys; require historical ALT bytes for full v0 replay |
| CPI dependency closure | **SOLVABLE** if state exists | Every invoked program and account must be present with correct version | Recursively capture program IDs, inner instructions and dependency accounts |
| Dynamic PDA derivation | **SOLVABLE** | Address derivation is deterministic, contents are not | Derive addresses; still require historical account contents |
| Recent blockhash expiration | **SOLVABLE** for execution reproduction | Historical wire transaction fails liveness checks | Preserve raw tx; explicitly disable age check; record assumption |
| Signature verification | **SOLVABLE** | Original signatures remain valid for the original message, but replay fixtures may modify state only | Keep original wire bytes; disable verifier only in isolated runner and record it |
| Fees / fee structure divergence | **MVP LIMITATION** | Fee debit and rent checks can differ by runtime/config | Compare effects; pin runtime/fee configuration; reject sensitive mismatches |
| sBPF version/verifier/runtime mismatch | **MVP LIMITATION** | A program may verify or execute differently | Exact runtime pins; retain ELF provenance; differential Agave backend |
| Loader v3/v4 semantics | **MVP LIMITATION** | Program layout, authority, visibility and cache rules differ | Parse loader kind; capture ProgramData; reject unknown/slot-unproven versions |
| One-slot program deployment visibility | **OUT OF SCOPE** initially | Program invoked in deployment/upgrade boundary can be unavailable by design | Reject boundary cases |
| Durable nonce and blockhash-dependent programs | **OUT OF SCOPE** initially | Requires nonce/recent-blockhash context | Explicit detector and rejection |
| Stake/vote/epoch state | **OUT OF SCOPE** initially | Requires large Bank and epoch/stake context | Exclude from MVP |
| Precompiles and newly activated syscalls | **MVP LIMITATION** | LiteSVM/Surfpool support can lag Agave | Compatibility corpus and second backend |
| Public RPC pruning/rate limits | **SOLVABLE** operationally | Transaction/block may be missing or throttled | Provider abstraction, retries, paid archival transaction RPC |
| Archive transaction RPC mistaken for state archive | **BLOCKER** to broad claim | Ledger history does not imply arbitrary account versions | Product copy and schema must separate transaction provenance from state provenance |
| JavaScript `u64` precision | **SOLVABLE** | `rentEpoch=u64::MAX` exceeds safe integer | Preserve large values as strings in future schema; current replay explicitly normalizes legacy `rentEpoch` |
| LiteSVM/Agave dependency skew | **SOLVABLE** but recurring | Loose semver already produced an uncompilable mixed graph | Exact pins + lockfile + CI; upgrade as a tested atomic unit |

## Threat model for misleading results

The most dangerous failure is not a crash; it is a green replay built from current state that happens to take the same branch. Therefore:

- every account has a confidence label;
- writable current-state snapshots block evidence-grade replay;
- there is no force bypass: unsupported provenance is refused before execution;
- `UNSUPPORTED` overrides any observed match;
- exact logs/CUs do not prove historical input correctness when provenance is missing.

## Archive RPC conclusion

Standard archive transaction retention is useful and often necessary for old `getTransaction`/`getBlock` calls. It is insufficient for arbitrary historical account-state reconstruction because the standard account methods expose commitment and `minContextSlot`, not a requested historical slot. A useful broad replay service would need a separate versioned account store/indexer or a provider-specific API, plus program/runtime/feature provenance.
