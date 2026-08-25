import { copyFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ELIGIBILITY, SCHEMA_VERSION, TOOL_VERSION } from "./constants.js";
import { isBase58Address, isTransactionSignature } from "./base58.js";
import { classifyTransaction } from "./transaction-class.js";
import { deriveAccountProvenance, summarizeProvenance } from "./provenance.js";
import { evaluateEligibility } from "./eligibility.js";
import { buildIntegrityIndex, resolveInside, sha256Value } from "./integrity.js";
import { ensureDir, readJson, writeJson } from "./io.js";

function expectedExecution(metadata, logs) {
  return {
    success: metadata.err == null,
    error: metadata.err,
    logs,
    computeUnitsConsumed: metadata.computeUnitsConsumed,
    postBalances: metadata.postBalances,
    postTokenBalances: metadata.postTokenBalances,
    innerInstructions: metadata.innerInstructions,
    returnData: metadata.returnData,
  };
}

function bundleReadme(manifest) {
  return `# Solana Repro bundle

- Signature: \`${manifest.signature}\`
- Original slot: \`${manifest.slot}\`
- Transaction class: \`${manifest.transactionClass}\`
- Eligibility: \`${manifest.eligibility}\`
- Schema: \`${manifest.schemaVersion}\`
- Backend: LiteSVM ${manifest.runtime.version} / Agave ${manifest.runtime.agave}

This directory is data, never executable script input. Validate integrity before replay:

\`\`\`bash
solrepro inspect .
solrepro replay .
solrepro compare .
solrepro assert .
\`\`\`

If eligibility is \`UNSUPPORTED\`, replay is intentionally refused. See \`provenance.json\` and the structured reason codes in \`manifest.json\`.
`;
}

export async function createBundle(artifactDirectory, { options = {} } = {}) {
  const artifactDir = path.resolve(artifactDirectory);
  const [transaction, metadata, accounts, programs, lookups] = await Promise.all([
    readJson(path.join(artifactDir, "transaction.json")),
    readJson(path.join(artifactDir, "metadata.json")),
    readJson(path.join(artifactDir, "accounts.json")),
    readJson(path.join(artifactDir, "programs.json")),
    readJson(path.join(artifactDir, "lookup-tables.json")),
  ]);
  const bundleDir = path.resolve(options.out || path.join(artifactDir, "bundle"));
  if (!isTransactionSignature(transaction.signature) || transaction.signature !== metadata.signature) {
    throw new Error("artifact transaction signature is invalid or inconsistent");
  }
  for (const role of metadata.accountRoles || []) {
    if (!isBase58Address(role.pubkey)) throw new Error(`artifact contains invalid account address: ${role.pubkey}`);
  }
  for (const program of programs || []) {
    if (!isBase58Address(program.programId)) throw new Error(`artifact contains invalid program address: ${program.programId}`);
  }
  const accountDir = await ensureDir(path.join(bundleDir, "accounts"));
  const programDir = await ensureDir(path.join(bundleDir, "programs"));
  await ensureDir(path.join(bundleDir, "lookup-tables"));

  const classification = classifyTransaction(transaction, metadata);
  const observed = new Map(accounts.values.map((value) => [value.pubkey, value]));
  const plannedAccounts = metadata.accountRoles.map((role) => deriveAccountProvenance({
    role,
    observed: observed.get(role.pubkey),
    metadata,
    transactionClass: classification.transactionClass,
    classDetails: classification.details,
  }));
  const lookupDescriptors = Array.isArray(lookups) ? lookups : (lookups.descriptors || []);
  const eligibility = evaluateEligibility({
    transactionClass: classification.transactionClass,
    accounts: plannedAccounts,
    programs,
    lookupTables: lookupDescriptors,
  });

  for (const account of plannedAccounts) {
    await writeJson(path.join(accountDir, `${account.pubkey}.json`), account);
  }
  for (const program of programs) {
    if (!program.executableFile) continue;
    await copyFile(resolveInside(artifactDir, program.executableFile), path.join(programDir, `${program.programId}.so`));
  }

  const logsText = await readFile(path.join(artifactDir, "logs.txt"), "utf8");
  const logs = logsText.trimEnd().split("\n").filter(Boolean);
  const originalExecution = {
    signature: metadata.signature,
    slot: metadata.slot,
    blockTime: metadata.blockTime,
    fee: metadata.fee,
    accountRoles: metadata.accountRoles,
    preBalances: metadata.preBalances,
    preTokenBalances: metadata.preTokenBalances,
    postTokenBalances: metadata.postTokenBalances,
    programIds: metadata.programIds,
    ...expectedExecution(metadata, logs),
  };
  const provenance = {
    originalSlot: metadata.slot,
    policy: "CURRENT_ONLY and UNKNOWN relevant inputs make a bundle UNSUPPORTED",
    summary: summarizeProvenance(plannedAccounts),
    accounts: plannedAccounts.map(({ pubkey, originalIndex, role, source, provenance: status, relevant, evidence, limitations }) => ({
      pubkey, originalIndex, role, source, provenance: status, relevant, originalSlot: metadata.slot,
      capturedSlot: accounts.capturedAtSlot, evidence, limitations,
    })),
    programs: programs.map((program) => ({
      programId: program.programId,
      source: program.executableFile ? "current_rpc_programdata" : "pinned_runtime",
      provenance: program.executableFile ? "CURRENT_ONLY" : "PROVEN",
      originalSlot: metadata.slot,
      capturedSlot: program.programData?.capturedAtSlot || accounts.capturedAtSlot,
      limitation: program.warning || null,
    })),
    lookupTables: lookupDescriptors.map((lookup) => ({
      pubkey: lookup.accountKey,
      source: "transaction_metadata_and_current_rpc",
      provenance: "CURRENT_ONLY",
      originalSlot: metadata.slot,
      capturedSlot: lookups.accounts?.capturedAtSlot || null,
    })),
  };
  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    toolVersion: TOOL_VERSION,
    cluster: metadata.sourceCluster,
    signature: metadata.signature,
    slot: metadata.slot,
    transactionClass: classification.transactionClass,
    eligibility: eligibility.status,
    eligibilityReasons: eligibility.reasons,
    stateProvenance: provenance.summary,
    stateProvider: metadata.historicalStateProvider || {
      name: "standard-rpc",
      capabilities: { transactionHistory: true, arbitraryHistoricalAccountState: false, historicalProgramBytes: false },
      legacyCapture: true,
    },
    runtime: { backend: "LiteSVM", version: "0.15.2", agave: "4.1.1" },
    featureSet: { mode: "litesvm-compiled-mainnet-feature-set", historicalSlotPinned: false },
    capturedAt: metadata.inspectedAt,
    knownLimitations: [
      "standard Solana RPC has no arbitrary historical getAccountInfo(slot)",
      "historical feature activations and sysvars are not reconstructed",
      "signature verification and recent blockhash age checks are disabled only inside the local replay runtime",
    ],
  };

  await Promise.all([
    copyFile(path.join(artifactDir, "transaction.json"), path.join(bundleDir, "transaction.json")),
    writeJson(path.join(bundleDir, "original-execution.json"), originalExecution),
    writeJson(path.join(bundleDir, "expected.json"), expectedExecution(metadata, logs)),
    writeJson(path.join(bundleDir, "provenance.json"), provenance),
    writeJson(path.join(bundleDir, "lookup-tables", "index.json"), { descriptors: lookupDescriptors }),
  ]);
  await writeFile(path.join(bundleDir, "README.md"), bundleReadme(manifest), "utf8");
  manifest.integrity = await buildIntegrityIndex(bundleDir);
  manifest.integrity.manifestCoreSha256 = sha256Value(manifest);
  await writeJson(path.join(bundleDir, "manifest.json"), manifest);
  return {
    bundleDir,
    transactionClass: manifest.transactionClass,
    eligibility: manifest.eligibility,
    reasons: manifest.eligibilityReasons,
    provenance: manifest.stateProvenance,
  };
}

export const bundleInternals = { expectedExecution, bundleReadme };
