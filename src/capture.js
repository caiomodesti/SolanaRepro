import path from "node:path";
import { isTransactionSignature } from "./base58.js";
import { createBundle } from "./bundle.js";
import { inspectTransaction } from "./inspect.js";

export async function captureTransaction(signature, { rpcUrl, options = {} }) {
  if (!isTransactionSignature(signature)) throw new Error("invalid Solana transaction signature");
  const outputRoot = path.resolve(options.out || "repros");
  const diagnosticDir = path.join(outputRoot, signature, "capture");
  const bundleDir = path.join(outputRoot, signature, "bundle");
  const inspection = await inspectTransaction(signature, { rpcUrl, options: { out: diagnosticDir } });
  const bundle = await createBundle(diagnosticDir, { options: { out: bundleDir } });
  return {
    signature,
    slot: inspection.slot,
    transactionClass: bundle.transactionClass,
    eligibility: bundle.eligibility,
    accountCount: inspection.accountCount,
    programIds: inspection.programIds,
    provenance: bundle.provenance,
    reasons: bundle.reasons,
    bundleDir,
  };
}
