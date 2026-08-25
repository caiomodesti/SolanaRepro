import path from "node:path";
import { writeFile } from "node:fs/promises";
import { encodeBase58 } from "./base58.js";
import { PROGRAMS } from "./constants.js";
import { ensureDir, resolveArtifactDir, writeJson, writeText } from "./io.js";
import { StandardRpcProvider } from "./historical-state-provider.js";

function unwrapAccountKey(key) {
  return typeof key === "string" ? key : key?.pubkey;
}

function transactionKeys(tx) {
  const message = tx.transaction.message;
  const staticKeys = (message.accountKeys || message.staticAccountKeys || []).map(unwrapAccountKey);
  const loaded = tx.meta?.loadedAddresses || { writable: [], readonly: [] };
  return {
    staticKeys,
    loadedAddresses: loaded,
    allKeys: [...staticKeys, ...(loaded.writable || []), ...(loaded.readonly || [])],
  };
}

function programIds(tx, allKeys) {
  const ids = new Set();
  for (const instruction of tx.transaction.message.instructions || []) {
    const id = instruction.programId || allKeys[instruction.programIdIndex];
    if (id) ids.add(id);
  }
  for (const group of tx.meta?.innerInstructions || []) {
    for (const instruction of group.instructions || []) {
      const id = instruction.programId || allKeys[instruction.programIdIndex];
      if (id) ids.add(id);
    }
  }
  return [...ids];
}

function rolesForKeys(tx, keys) {
  const header = tx.transaction.message.header;
  const staticLength = keys.staticKeys.length;
  const signedWritableEnd = header.numRequiredSignatures - header.numReadonlySignedAccounts;
  const unsignedWritableEnd = staticLength - header.numReadonlyUnsignedAccounts;
  return keys.allKeys.map((pubkey, index) => {
    let source = "static";
    let signer = false;
    let writable = false;
    if (index < staticLength) {
      signer = index < header.numRequiredSignatures;
      writable = signer ? index < signedWritableEnd : index < unsignedWritableEnd;
    } else if (index < staticLength + keys.loadedAddresses.writable.length) {
      source = "lookup-writable";
      writable = true;
    } else {
      source = "lookup-readonly";
    }
    return { index, pubkey, source, signer, writable };
  });
}

function decodeUpgradeableProgramDataAddress(account) {
  if (!account || account.owner !== PROGRAMS.BPF_UPGRADEABLE_LOADER) return null;
  const bytes = Buffer.from(account.data[0], "base64");
  if (bytes.length < 36 || bytes.readUInt32LE(0) !== 2) return null;
  // Avoid adding another codec dependency: web3.js is used only for canonical base58 here.
  return bytes.subarray(4, 36);
}

function encodeAddress(bytes) {
  return bytes ? encodeBase58(bytes) : null;
}

async function collectPrograms(provider, ids, accountMap, originalSlot, artifactDir) {
  const programsDir = await ensureDir(path.join(artifactDir, "programs"));
  const results = [];
  for (const programId of ids) {
    const programAccount = accountMap.get(programId) || null;
    const programDataAddress = encodeAddress(decodeUpgradeableProgramDataAddress(programAccount));
    let programData = null;
    let executableBytes = null;
    if (programDataAddress) {
      const response = await provider.getAccountAtSlot(programDataAddress, originalSlot);
      programData = { pubkey: programDataAddress, capturedAtSlot: response.capturedAtSlot, provenance: response.provenance, account: response.account };
      if (response.account?.data?.[0]) {
        const raw = Buffer.from(response.account.data[0], "base64");
        // UpgradeableLoader ProgramData metadata is 45 bytes when an authority is present.
        // Derive the exact offset from the serialized option rather than assuming it.
        if (raw.length >= 13 && raw.readUInt32LE(0) === 3) {
          const option = raw[12];
          const offset = option === 0 ? 13 : 45;
          if (raw.length > offset) executableBytes = raw.subarray(offset);
        }
      }
    }
    if (executableBytes) await writeFile(path.join(programsDir, `${programId}.so`), executableBytes);
    results.push({
      programId,
      kind: programId === PROGRAMS.SYSTEM ? "builtin-system" : programAccount?.executable ? "executable-account" : "unresolved-or-precompile",
      loader: programAccount?.owner || null,
      programAccount,
      programData,
      executableFile: executableBytes ? `programs/${programId}.so` : null,
      warning: programDataAddress ? "program bytes are current-state bytes, not proven bytes at original slot" : null,
    });
  }
  return results;
}

export async function inspectTransaction(signature, { rpcUrl, options = {}, provider: suppliedProvider }) {
  const provider = suppliedProvider || new StandardRpcProvider(rpcUrl);
  const artifactDir = path.resolve(options.out || resolveArtifactDir(signature));
  await ensureDir(artifactDir);

  const [jsonTx, base64Tx] = await Promise.all([
    provider.getTransaction(signature, "json"),
    provider.getTransaction(signature, "base64"),
  ]);
  if (!jsonTx || !base64Tx) throw new Error(`transaction unavailable from this RPC: ${signature}`);

  const keys = transactionKeys(jsonTx);
  const roles = rolesForKeys(jsonTx, keys);
  const ids = programIds(jsonTx, keys.allKeys);
  const accounts = await provider.getAccountsAtSlot(keys.allKeys, jsonTx.slot);
  const accountMap = new Map(accounts.values.map(({ pubkey, account }) => [pubkey, account]));
  const programs = await collectPrograms(provider, ids, accountMap, jsonTx.slot, artifactDir);
  const lookups = jsonTx.transaction.message.addressTableLookups || [];
  const lookupAddresses = lookups.map((lookup) => lookup.accountKey).filter(Boolean);
  const lookupAccounts = lookupAddresses.length
    ? await provider.getAccountsAtSlot(lookupAddresses, jsonTx.slot)
    : {
        method: "getMultipleAccounts",
        semantics: "no lookup tables referenced",
        minContextSlot: jsonTx.slot,
        capturedAtSlot: null,
        apiVersions: [],
        values: [],
      };
  let block = null;
  try {
    block = await provider.getBlock(jsonTx.slot);
  } catch (error) {
    block = { unavailable: true, reason: error.message };
  }

  const metadata = {
    signature,
    sourceCluster: "mainnet-beta",
    inspectedAt: new Date().toISOString(),
    rpcEndpointStored: false,
    historicalStateProvider: { name: provider.name, capabilities: provider.capabilities },
    slot: jsonTx.slot,
    blockTime: jsonTx.blockTime,
    blockContext: block,
    version: jsonTx.version,
    err: jsonTx.meta?.err ?? null,
    fee: jsonTx.meta?.fee ?? null,
    preBalances: jsonTx.meta?.preBalances || [],
    postBalances: jsonTx.meta?.postBalances || [],
    preTokenBalances: jsonTx.meta?.preTokenBalances || [],
    postTokenBalances: jsonTx.meta?.postTokenBalances || [],
    computeUnitsConsumed: jsonTx.meta?.computeUnitsConsumed ?? null,
    returnData: jsonTx.meta?.returnData ?? null,
    innerInstructions: jsonTx.meta?.innerInstructions ?? null,
    loadedAddresses: keys.loadedAddresses,
    accountRoles: roles,
    programIds: ids,
    addressTableLookups: lookups,
    historicalStateFinding: {
      getTransactionProvidesFullAccountDataPreState: false,
      getTransactionProvidesLamportPreState: true,
      getTransactionProvidesSelectedTokenAmountPreState: true,
      getAccountInfoAtArbitraryPastSlotStandardRpc: false,
      note: "minContextSlot is a lower bound on node context, not a historical-state selector",
    },
  };

  await Promise.all([
    writeJson(path.join(artifactDir, "transaction.json"), {
      signature,
      rawBase64: Array.isArray(base64Tx.transaction) ? base64Tx.transaction[0] : base64Tx.transaction,
      rawEncoding: "base64",
      rpcJson: jsonTx.transaction,
      version: jsonTx.version,
    }),
    writeJson(path.join(artifactDir, "metadata.json"), metadata),
    writeJson(path.join(artifactDir, "accounts.json"), accounts),
    writeJson(path.join(artifactDir, "programs.json"), programs),
    writeJson(path.join(artifactDir, "lookup-tables.json"), {
      descriptors: lookups,
      accounts: lookupAccounts,
      warning: "ALT account bytes are current-state observations, not proven historical bytes",
    }),
    writeText(path.join(artifactDir, "logs.txt"), `${(jsonTx.meta?.logMessages || []).join("\n")}\n`),
  ]);

  return {
    signature,
    artifactDir,
    slot: jsonTx.slot,
    success: jsonTx.meta?.err == null,
    version: jsonTx.version,
    accountCount: keys.allKeys.length,
    programIds: ids,
    hasAlt: lookups.length > 0,
    hasCpi: (jsonTx.meta?.innerInstructions || []).some((group) => group.instructions?.length),
    currentAccountStateCapturedAtSlot: accounts.capturedAtSlot,
    rpcApiVersionsObserved: [...new Set([...accounts.apiVersions, ...lookupAccounts.apiVersions])],
  };
}

export const inspectInternals = { transactionKeys, programIds, rolesForKeys };
