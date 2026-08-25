# License decision

SolanaRepro uses Apache License 2.0 because the project is intended as open infrastructure and benefits from an explicit patent grant and clear contribution terms. This is compatible with the Apache-2.0-licensed Solana/Agave and LiteSVM dependencies used by the pinned replay backend.

The repository does not redistribute dependency source code. The committed SPL Token program fixture is captured mainnet bytecode used as test evidence; it remains attributable to its upstream program and should be reviewed before a public binary release. This document is an engineering compatibility note, not legal advice.

