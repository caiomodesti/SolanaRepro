import { lstat } from "node:fs/promises";
import path from "node:path";
import {
  ELIGIBILITY,
  REASON_CODES,
  SCHEMA_VERSION,
  TRANSACTION_CLASSES,
} from "./constants.js";
import { isTransactionSignature } from "./base58.js";
import { BundleValidationError, integrityLimits, sha256Value, verifyIntegrity } from "./integrity.js";
import { readJson } from "./io.js";
import { runtimeCompatibility } from "./eligibility.js";

const REQUIRED = [
  "manifest.json",
  "transaction.json",
  "original-execution.json",
  "expected.json",
  "provenance.json",
  "README.md",
];

export async function validateBundle(bundleDirectory, { requireSupportedRuntime = true } = {}) {
  const bundleDir = path.resolve(bundleDirectory);
  for (const relative of REQUIRED) {
    try {
      const stat = await lstat(path.join(bundleDir, relative));
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > integrityLimits.MAX_FILE_BYTES) throw new Error("unsafe file");
    } catch {
      throw new BundleValidationError(REASON_CODES.CORRUPTED_BUNDLE, `missing required bundle file: ${relative}`);
    }
  }
  const manifest = await readJson(path.join(bundleDir, "manifest.json"));
  if (manifest.schemaVersion !== SCHEMA_VERSION) {
    throw new BundleValidationError(REASON_CODES.INVALID_SCHEMA_VERSION, `unsupported schema version: ${manifest.schemaVersion}`);
  }
  if (!isTransactionSignature(manifest.signature)) {
    throw new BundleValidationError(REASON_CODES.CORRUPTED_BUNDLE, "manifest signature is invalid");
  }
  if (!Object.values(TRANSACTION_CLASSES).includes(manifest.transactionClass)) {
    throw new BundleValidationError(REASON_CODES.CORRUPTED_BUNDLE, "manifest transaction class is invalid");
  }
  if (!Object.values(ELIGIBILITY).includes(manifest.eligibility)) {
    throw new BundleValidationError(REASON_CODES.CORRUPTED_BUNDLE, "manifest eligibility is invalid");
  }
  const { integrity: manifestIntegrity, ...manifestCore } = manifest;
  const suppliedIntegrity = { ...manifestIntegrity };
  delete suppliedIntegrity.manifestCoreSha256;
  const recomputedManifestHash = sha256Value({ ...manifestCore, integrity: suppliedIntegrity });
  if (recomputedManifestHash !== manifest.integrity?.manifestCoreSha256) {
    throw new BundleValidationError(REASON_CODES.CORRUPTED_BUNDLE, "manifest core SHA-256 mismatch");
  }
  const integrity = await verifyIntegrity(bundleDir, manifest.integrity);
  const runtime = runtimeCompatibility(manifest);
  if (requireSupportedRuntime && !runtime.compatible) {
    throw new BundleValidationError(REASON_CODES.RUNTIME_MISMATCH, runtime.reasons[0].message, runtime.reasons[0].details);
  }
  const [transaction, originalExecution, expected, provenance] = await Promise.all([
    readJson(path.join(bundleDir, "transaction.json")),
    readJson(path.join(bundleDir, "original-execution.json")),
    readJson(path.join(bundleDir, "expected.json")),
    readJson(path.join(bundleDir, "provenance.json")),
  ]);
  if (transaction.signature !== manifest.signature || originalExecution.signature !== manifest.signature) {
    throw new BundleValidationError(REASON_CODES.CORRUPTED_BUNDLE, "signature mismatch across bundle files");
  }
  if (!Array.isArray(provenance.accounts)) {
    throw new BundleValidationError(REASON_CODES.CORRUPTED_BUNDLE, "provenance accounts must be an array");
  }
  return { bundleDir, manifest, transaction, originalExecution, expected, provenance, integrity, runtime };
}
