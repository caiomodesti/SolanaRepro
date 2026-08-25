# Security policy

## Reporting

Do not open a public issue for a vulnerability that could enable bundle path escape, arbitrary code execution, integrity bypass, or a false `SUPPORTED`/`EXACT` result. Contact the maintainers privately with the affected version, reproduction steps, impact, and suggested remediation. No public security contact exists in this local checkout yet; one must be configured before public release.

## Threat model

SolanaRepro treats RPC responses and third-party bundles as untrusted data. Before replay, it validates required regular files, rejects symlinks and path traversal, caps file count and byte size, checks schema and runtime pins, verifies the manifest core and every immutable file with SHA-256, and applies the provenance eligibility gate.

Bundles are data. They must never contain or invoke scripts. The Rust runner is started with fixed arguments, a bounded output buffer, and a timeout only after validation. Program binaries are not loaded for any currently supported transaction class.

## Trust limitations

SHA-256 detects modification relative to the manifest; it does not authenticate who created a bundle. RPC transport and provider assertions are not cryptographic historical proofs. LiteSVM is a pinned replay backend, not the original historical validator. Signature verification and blockhash-age checks are disabled only in the isolated historical runner and do not authorize a network transaction.

Never put RPC credentials in a bundle or command committed to source control. Use `SOLANA_RPC_URL` at runtime. Review `provenance.json` and reject unexplained `INFERRED` inputs. Do not reinterpret `CURRENT_ONLY` as historical state.

## Supported versions

Only the current `0.1.x` development line is in scope. This repository has not yet published a security-supported release.

