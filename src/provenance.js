import { decodeBase58 } from "./base58.js";
import { PROGRAMS, PROVENANCE } from "./constants.js";

const RUNTIME_PROGRAMS = new Set([
  PROGRAMS.SYSTEM,
  PROGRAMS.TOKEN,
  PROGRAMS.TOKEN_2022,
  PROGRAMS.ASSOCIATED_TOKEN,
  PROGRAMS.COMPUTE_BUDGET,
  PROGRAMS.ADDRESS_LOOKUP_TABLE,
]);

function baseAccount({ lamports, data, owner, executable = false }) {
  return { lamports, dataBase64: data.toString("base64"), owner, executable, rentEpoch: 0 };
}

function classicTokenAccount(balance, lamports) {
  const data = Buffer.alloc(165);
  decodeBase58(balance.mint).copy(data, 0);
  decodeBase58(balance.owner).copy(data, 32);
  data.writeBigUInt64LE(BigInt(balance.uiTokenAmount.amount), 64);
  data[108] = 1;
  return baseAccount({ lamports, data, owner: PROGRAMS.TOKEN });
}

function classicMintAccount(mint, decimals, lamports) {
  const data = Buffer.alloc(82);
  data[44] = decimals;
  data[45] = 1;
  return baseAccount({ lamports, data, owner: PROGRAMS.TOKEN });
}

function currentSnapshot(account, lamports) {
  return baseAccount({
    lamports,
    data: Buffer.from(account.data?.[0] || "", "base64"),
    owner: account.owner,
    executable: account.executable,
  });
}

function entry(role, values) {
  return {
    pubkey: role.pubkey,
    originalIndex: role.index,
    role,
    relevant: true,
    replayUse: false,
    preState: null,
    limitations: [],
    ...values,
  };
}

export function deriveAccountProvenance({ role, observed, metadata, transactionClass, classDetails }) {
  const preLamports = metadata.preBalances[role.index];
  const current = observed?.account || null;
  if (metadata.programIds.includes(role.pubkey) && RUNTIME_PROGRAMS.has(role.pubkey)) {
    return entry(role, {
      source: "pinned_runtime",
      provenance: PROVENANCE.PROVEN,
      evidence: ["program id is supplied by the pinned LiteSVM runtime"],
    });
  }
  if (transactionClass === "CLASSIC_SPL_TRANSFER") {
    const balance = metadata.preTokenBalances.find((candidate) => candidate.accountIndex === role.index);
    if (role.index === classDetails.sourceIndex || role.index === classDetails.destinationIndex) {
      return entry(role, {
        source: "inferred_from_transaction",
        provenance: PROVENANCE.INFERRED,
        replayUse: true,
        preState: classicTokenAccount(balance, preLamports),
        evidence: ["mint, owner, amount and decimals come from preTokenBalances", "initialized classic SPL layout follows the validated transfer class"],
        limitations: ["unused classic SPL fields are normalized rather than recovered historically"],
      });
    }
    if (role.index === classDetails.mintIndex) {
      const source = metadata.preTokenBalances.find((candidate) => candidate.accountIndex === classDetails.sourceIndex);
      return entry(role, {
        source: "inferred_from_transaction",
        provenance: PROVENANCE.INFERRED,
        replayUse: true,
        preState: classicMintAccount(role.pubkey, source.uiTokenAmount.decimals, preLamports),
        evidence: ["mint address and decimals come from transaction metadata", "initialized classic Mint layout is synthesized for TransferChecked"],
        limitations: ["supply and authorities are normalized because TransferChecked does not consume them"],
      });
    }
    if (role.index === classDetails.authorityIndex && preLamports === 0 && !current) {
      return entry(role, {
        source: "transaction_metadata",
        provenance: PROVENANCE.PROVEN,
        evidence: ["message marks the authority as signer", "no account existed before or after the transaction"],
      });
    }
  }
  if (current?.owner === PROGRAMS.SYSTEM && Buffer.from(current.data?.[0] || "", "base64").length === 0) {
    return entry(role, {
      source: "transaction_metadata",
      provenance: PROVENANCE.PROVEN,
      replayUse: true,
      preState: currentSnapshot(current, preLamports),
      evidence: ["pre-transaction lamports come from getTransaction", "System account data is structurally empty"],
    });
  }
  if (!current && preLamports === 0 && !role.writable) {
    return entry(role, {
      source: "transaction_metadata",
      provenance: PROVENANCE.PROVEN,
      evidence: ["zero pre-balance and absent account are recorded by the transaction/current observation"],
    });
  }
  if (!current) {
    return entry(role, {
      source: "unavailable",
      provenance: PROVENANCE.UNKNOWN,
      evidence: [],
      limitations: ["account is closed or unavailable and full historical bytes were not recovered"],
    });
  }
  return entry(role, {
    source: "current_rpc",
    provenance: PROVENANCE.CURRENT_ONLY,
    preState: currentSnapshot(current, preLamports),
    evidence: [`account observed at current RPC context, not at original slot ${metadata.slot}`],
    limitations: ["current account bytes cannot be treated as historical pre-state"],
  });
}

export function summarizeProvenance(entries) {
  const summary = { PROVEN: 0, INFERRED: 0, CURRENT_ONLY: 0, UNKNOWN: 0 };
  for (const item of entries) summary[item.provenance] += 1;
  return summary;
}

export const provenanceInternals = { classicTokenAccount, classicMintAccount, currentSnapshot, RUNTIME_PROGRAMS };
