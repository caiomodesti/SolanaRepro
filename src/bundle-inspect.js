import { validateBundle } from "./bundle-validation.js";

export async function inspectBundle(bundleDirectory) {
  const validated = await validateBundle(bundleDirectory, { requireSupportedRuntime: false });
  const { manifest, originalExecution, provenance, integrity, runtime } = validated;
  return {
    bundleDir: validated.bundleDir,
    signature: manifest.signature,
    slot: manifest.slot,
    transactionClass: manifest.transactionClass,
    eligibility: manifest.eligibility,
    reasons: manifest.eligibilityReasons,
    provenance: provenance.summary,
    programs: originalExecution.programIds,
    expected: {
      success: originalExecution.success,
      error: originalExecution.error,
      computeUnitsConsumed: originalExecution.computeUnitsConsumed,
    },
    integrity,
    runtime,
  };
}
