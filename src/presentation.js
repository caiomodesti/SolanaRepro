function valueOrDash(value) {
  return value == null ? "—" : String(value);
}

function lines(values) {
  return values.filter(Boolean).join("\n");
}

export function formatCapture(result) {
  return lines([
    "Solana Repro",
    "",
    `Transaction: ${result.signature}`,
    `Slot: ${result.slot}`,
    `Transaction class: ${result.transactionClass}`,
    `Eligibility: ${result.eligibility}`,
    `Accounts: ${result.accountCount}`,
    `Programs: ${result.programIds.length}`,
    `State provenance: ${Object.entries(result.provenance).map(([key, value]) => `${value} ${key}`).join(", ")}`,
    result.reasons.length ? "Reasons:" : null,
    ...result.reasons.map((reason) => `- ${reason.code}: ${reason.message}`),
    `Bundle: ${result.bundleDir}`,
  ]);
}

export function formatInspection(result) {
  return lines([
    "SOLANA REPRO BUNDLE",
    "",
    `Signature: ${result.signature}`,
    `Slot: ${result.slot}`,
    `Class: ${result.transactionClass}`,
    `Eligibility: ${result.eligibility}`,
    `State provenance: ${Object.entries(result.provenance).map(([key, value]) => `${value} ${key}`).join(", ")}`,
    `Programs: ${result.programs.join(", ")}`,
    `Expected result: ${result.expected.success ? "SUCCESS" : "FAILURE"}`,
    `Integrity: VALID (${result.integrity.fileCount} files, ${result.integrity.totalBytes} bytes)`,
    `Runtime: ${result.runtime.compatible ? "COMPATIBLE" : "UNSUPPORTED"}`,
    result.reasons.length ? "Reasons:" : null,
    ...result.reasons.map((reason) => `- ${reason.code}: ${reason.message}`),
  ]);
}

export function formatComparison(comparison) {
  if (comparison.status === "UNSUPPORTED") {
    return lines([
      "Solana Repro comparison",
      "",
      "Fidelity: UNSUPPORTED",
      ...(comparison.reasons || []).map((reason) => `- ${reason.code}: ${reason.message}`),
    ]);
  }
  const checks = comparison.checks;
  return lines([
    "Solana Repro comparison",
    "",
    `Original: ${checks.result.original ? "SUCCESS" : "FAILED"}`,
    `Replay:   ${checks.result.replay ? "SUCCESS" : "FAILED"}`,
    `Error: ${checks.error.match ? "EXACT" : "MISMATCH"}`,
    `Logs: ${checks.logs.exact ? "EXACT" : `similarity ${checks.logs.similarity}`}`,
    `Compute Units: ${valueOrDash(checks.computeUnits.original)} / ${valueOrDash(checks.computeUnits.replay)}`,
    `Relevant SOL state: ${checks.postBalances.exact ? "EXACT" : "MISMATCH"}`,
    `Relevant token state: ${checks.postTokenBalances.exact ? "EXACT" : "MISMATCH"}`,
    `Inner instructions: ${checks.innerInstructions.exact ? "EXACT" : "MISMATCH"}`,
    `Return data: ${checks.returnData.exact ? "EXACT" : "MISMATCH"}`,
    `Fidelity: ${comparison.status}`,
  ]);
}

export function formatAssertion(result) {
  return lines([
    "Solana Repro regression",
    "",
    `Expected: ${result.expected}`,
    `Actual:   ${result.actual}`,
    `Fidelity: ${result.status}`,
    `Result: ${result.passed ? "PASS" : "REGRESSION DETECTED"}`,
  ]);
}
