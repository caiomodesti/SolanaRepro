import {
  ELIGIBILITY,
  PROVENANCE,
  REASON_CODES,
  REASON_MESSAGES,
  TRANSACTION_CLASSES,
} from "./constants.js";
import { provenanceInternals } from "./provenance.js";

function reason(code, details = {}) {
  return { code, message: REASON_MESSAGES[code], details };
}

export function evaluateEligibility({ transactionClass, accounts, programs, lookupTables }) {
  const reasons = [];
  if (transactionClass === TRANSACTION_CLASSES.UNSUPPORTED) {
    reasons.push(reason(REASON_CODES.TRANSACTION_CLASS));
  }
  if (lookupTables.length) {
    reasons.push(reason(REASON_CODES.ALT_HISTORICAL_STATE, { lookupTables: lookupTables.map((item) => item.accountKey) }));
  }
  const unsafeAccounts = accounts.filter((account) =>
    account.relevant && (account.provenance === PROVENANCE.CURRENT_ONLY || account.provenance === PROVENANCE.UNKNOWN));
  if (unsafeAccounts.length) {
    reasons.push(reason(REASON_CODES.ACCOUNT_PRESTATE, { accounts: unsafeAccounts.map((account) => account.pubkey) }));
  }
  const unsafePrograms = programs.filter((program) =>
    program.executableFile && !provenanceInternals.RUNTIME_PROGRAMS.has(program.programId));
  if (unsafePrograms.length) {
    reasons.push(reason(REASON_CODES.PROGRAM_PROVENANCE, { programs: unsafePrograms.map((program) => program.programId) }));
    if (unsafePrograms.some((program) => program.loader?.includes("Upgradeab1e"))) {
      reasons.push(reason(REASON_CODES.UPGRADEABLE_PROGRAM_VERSION, { programs: unsafePrograms.map((program) => program.programId) }));
    }
  }
  return {
    status: reasons.length ? ELIGIBILITY.UNSUPPORTED : ELIGIBILITY.SUPPORTED,
    reasons,
  };
}

export function runtimeCompatibility(manifest) {
  const runtime = manifest.runtime || {};
  const exact = runtime.backend === "LiteSVM" && runtime.version === "0.15.2" && runtime.agave === "4.1.1";
  return exact ? { compatible: true, reasons: [] } : {
    compatible: false,
    reasons: [reason(REASON_CODES.RUNTIME_MISMATCH, { expected: { backend: "LiteSVM", version: "0.15.2", agave: "4.1.1" }, actual: runtime })],
  };
}
