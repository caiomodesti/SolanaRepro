import path from "node:path";
import { FIDELITY } from "./constants.js";
import { readJson, readJsonLimited, writeJson } from "./io.js";
import { validateBundle } from "./bundle-validation.js";

function stable(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
}

export function canonicalError(error) {
  if (error == null) return null;
  if (typeof error === "string") return error.replace(/\s+/g, "");
  if (error.InstructionError) {
    const [index, detail] = error.InstructionError;
    if (detail && typeof detail === "object" && "Custom" in detail) {
      return `InstructionError(${index},Custom(${detail.Custom}))`;
    }
    return `InstructionError(${index},${typeof detail === "string" ? detail : stable(detail)})`.replace(/\s+/g, "");
  }
  if (error.InsufficientFundsForRent) {
    return `InsufficientFundsForRent{account_index:${error.InsufficientFundsForRent.account_index}}`;
  }
  return stable(error).replace(/\s+/g, "");
}

function lcsLength(left, right) {
  const row = new Uint32Array(right.length + 1);
  for (const a of left) {
    let diagonal = 0;
    for (let index = 1; index <= right.length; index += 1) {
      const previous = row[index];
      row[index] = a === right[index - 1] ? diagonal + 1 : Math.max(row[index], row[index - 1]);
      diagonal = previous;
    }
  }
  return row[right.length];
}

export function logSimilarity(expected, actual) {
  if (!expected.length && !actual.length) return 1;
  return (2 * lcsLength(expected, actual)) / (expected.length + actual.length);
}

export function canonicalReturnData(value) {
  if (value == null) return null;
  return {
    programId: value.programId || value.program_id || null,
    dataBase64: value.dataBase64 || (Array.isArray(value.data) ? value.data[0] : value.data) || "",
  };
}

function postBalanceChecks(original, replay) {
  const byPubkey = new Map(replay.postAccounts.map((account) => [account.pubkey, account.lamports]));
  return original.accountRoles.filter((role) => role.writable).map((role) => ({
    pubkey: role.pubkey,
    expected: original.postBalances[role.index],
    actual: byPubkey.get(role.pubkey) ?? (original.postBalances[role.index] === 0 ? 0 : null),
    exact: (byPubkey.get(role.pubkey) ?? (original.postBalances[role.index] === 0 ? 0 : null)) === original.postBalances[role.index],
  }));
}

function postTokenChecks(original, replay) {
  const roles = new Map(original.accountRoles.map((role) => [role.index, role.pubkey]));
  const replayAccounts = new Map(replay.postAccounts.map((account) => [account.pubkey, account]));
  return (original.postTokenBalances || []).map((balance) => {
    const pubkey = roles.get(balance.accountIndex);
    const replayAccount = replayAccounts.get(pubkey);
    const bytes = replayAccount ? Buffer.from(replayAccount.dataBase64, "base64") : Buffer.alloc(0);
    const actual = bytes.length >= 72 ? bytes.readBigUInt64LE(64).toString() : null;
    const expected = balance.uiTokenAmount.amount;
    return { pubkey, mint: balance.mint, expected, actual, exact: expected === actual };
  });
}

export async function compareReplay(bundleDirectory, replayFile, { options = {} } = {}) {
  const bundleDir = path.resolve(bundleDirectory);
  const validated = await validateBundle(bundleDir, { requireSupportedRuntime: false });
  const [expected, original, replay] = await Promise.all([
    readJson(path.join(bundleDir, "expected.json")),
    readJson(path.join(bundleDir, "original-execution.json")),
    readJsonLimited(path.resolve(replayFile)),
  ]);
  const manifest = validated.manifest;
  if (replay.status === "UNSUPPORTED") {
    const comparison = {
      status: FIDELITY.UNSUPPORTED,
      rulesVersion: "0.1",
      reasons: replay.reasons || manifest.eligibilityReasons,
      checks: {},
      classificationRules: {
        UNSUPPORTED: "bundle eligibility or runtime compatibility is insufficient for a defensible comparison",
      },
    };
    await writeJson(path.resolve(options.out || path.join(bundleDir, "comparison.json")), comparison);
    return comparison;
  }
  const resultExact = expected.success === replay.success;
  const expectedError = canonicalError(expected.error);
  const actualError = canonicalError(replay.error);
  const errorExact = expectedError === actualError;
  const similarity = logSimilarity(expected.logs || [], replay.logs || []);
  const logsExact = similarity === 1;
  const originalCu = expected.computeUnitsConsumed;
  const replayCu = replay.computeUnitsConsumed;
  const differencePercent = originalCu == null || replayCu == null || originalCu === 0
    ? null
    : Math.abs(replayCu - originalCu) / originalCu * 100;
  const computeExact = originalCu === replayCu;
  const balances = postBalanceChecks(original, replay);
  const balancesExact = balances.every((check) => check.exact);
  const tokenBalances = postTokenChecks(original, replay);
  const tokenBalancesExact = tokenBalances.every((check) => check.exact);
  const innerInstructionsExact = stable(expected.innerInstructions || []) === stable(replay.innerInstructions || []);
  const returnDataExact = stable(canonicalReturnData(expected.returnData)) === stable(canonicalReturnData(replay.returnData));

  let status;
  if (!resultExact || !errorExact) status = FIDELITY.FAILED;
  else if (logsExact && computeExact && balancesExact && tokenBalancesExact && innerInstructionsExact && returnDataExact) status = FIDELITY.EXACT;
  else if (similarity >= 0.95 && (differencePercent == null || differencePercent <= 1) && balancesExact && tokenBalancesExact && innerInstructionsExact) status = FIDELITY.HIGH_FIDELITY;
  else status = FIDELITY.PARTIAL;
  if (manifest.eligibility === "UNSUPPORTED" && status !== FIDELITY.FAILED) {
    status = FIDELITY.UNSUPPORTED;
  }

  const comparison = {
    status,
    rulesVersion: "0.1",
    checks: {
      result: { match: resultExact, original: expected.success, replay: replay.success },
      error: { match: errorExact, original: expectedError, replay: actualError },
      logs: { exact: logsExact, similarity, originalLines: expected.logs?.length || 0, replayLines: replay.logs?.length || 0 },
      computeUnits: { exact: computeExact, original: originalCu, replay: replayCu, differencePercent },
      postBalances: { exact: balancesExact, accounts: balances },
      postTokenBalances: { exact: tokenBalancesExact, accounts: tokenBalances },
      innerInstructions: { exact: innerInstructionsExact },
      returnData: { exact: returnDataExact },
    },
    classificationRules: {
      EXACT: "result, error, logs, compute units, compared lamport/token post-balances, inner instructions and return data are exact",
      HIGH_FIDELITY: "result/error and inner instructions exact; log LCS similarity >= 0.95; CU difference <= 1%; compared lamport/token balances exact",
      PARTIAL: "result/error exact, but one or more fidelity signals miss high-fidelity thresholds",
      FAILED: "result or canonical transaction error differs",
      UNSUPPORTED: "bundle lacks defensible historical pre-state even if an attempted replay happens to match",
    },
  };
  await writeJson(path.resolve(options.out || path.join(bundleDir, "comparison.json")), comparison);
  return comparison;
}
