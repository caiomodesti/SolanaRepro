import path from "node:path";
import { PROGRAMS } from "./constants.js";
import { writeJson } from "./io.js";
import { RpcClient } from "./rpc.js";

function classify(tx) {
  if (!tx) return [];
  const message = tx.transaction.message;
  const staticKeys = (message.accountKeys || []).map((key) => typeof key === "string" ? key : key.pubkey);
  const loaded = tx.meta?.loadedAddresses || { writable: [], readonly: [] };
  const allKeys = [...staticKeys, ...loaded.writable, ...loaded.readonly];
  const ids = new Set((message.instructions || []).map((ix) => ix.programId || allKeys[ix.programIdIndex]));
  const classes = [];
  const systemOnly = [...ids].every((id) => id === PROGRAMS.SYSTEM || id === PROGRAMS.COMPUTE_BUDGET);
  const simpleTokenPrograms = new Set([
    PROGRAMS.SYSTEM,
    PROGRAMS.COMPUTE_BUDGET,
    PROGRAMS.TOKEN,
    PROGRAMS.TOKEN_2022,
    PROGRAMS.ASSOCIATED_TOKEN,
  ]);
  const tokenOnly = [...ids].every((id) => simpleTokenPrograms.has(id));
  const pureTokenOnly = [...ids].every((id) => id === PROGRAMS.TOKEN || id === PROGRAMS.TOKEN_2022 || id === PROGRAMS.COMPUTE_BUDGET);
  if (ids.has(PROGRAMS.SYSTEM) && systemOnly) classes.push("A_SYSTEM");
  if ((ids.has(PROGRAMS.TOKEN) || ids.has(PROGRAMS.TOKEN_2022)) && tokenOnly) classes.push("B_SPL_TOKEN");
  if ((ids.has(PROGRAMS.TOKEN) || ids.has(PROGRAMS.TOKEN_2022)) && pureTokenOnly) classes.push("B_SPL_TOKEN_PURE");
  if (tx.meta?.err == null && (ids.has(PROGRAMS.TOKEN) || ids.has(PROGRAMS.TOKEN_2022)) && pureTokenOnly) classes.push("B_SPL_TOKEN_PURE_SUCCESS");
  if ((message.addressTableLookups || []).length) classes.push("C_V0_ALT");
  if ((tx.meta?.innerInstructions || []).some((group) => group.instructions?.length)) classes.push("D_CPI");
  if (tx.meta?.err != null) classes.push("E_FAILED");
  if (tx.meta?.err != null && systemOnly) classes.push("E_FAILED_SYSTEM");
  if (ids.size >= 3 && classes.includes("D_CPI")) classes.push("F_COMPLEX_MULTI_PROGRAM");
  return classes;
}

export async function discoverCases({ rpcUrl, limit = 100, options = {} }) {
  const rpc = new RpcClient(rpcUrl);
  const targets = [PROGRAMS.SYSTEM, PROGRAMS.TOKEN];
  const signatureLists = await Promise.all(targets.map((address) =>
    rpc.call("getSignaturesForAddress", [address, { commitment: "confirmed", limit }])));
  const ranked = signatureLists.flatMap((items, targetIndex) => items.map((item) => ({
    ...item,
    target: targets[targetIndex],
    rank: targetIndex * 10 + (item.err == null ? 1 : 0),
  }))).sort((left, right) => left.rank - right.rank);
  const signatures = [...new Map(ranked.map((item) => [item.signature, item])).values()].map((item) => item.signature);
  const selected = {};
  const observations = [];

  for (const signature of signatures) {
    let tx;
    try {
      tx = await rpc.call("getTransaction", [signature, {
        commitment: "confirmed",
        encoding: "json",
        maxSupportedTransactionVersion: 0,
      }]);
    } catch (error) {
      observations.push({ signature, unavailable: error.message });
      continue;
    }
    const classes = classify(tx);
    observations.push({ signature, slot: tx?.slot, classes });
    for (const candidate of classes) selected[candidate] ||= signature;
    if (["A_SYSTEM", "B_SPL_TOKEN", "B_SPL_TOKEN_PURE", "B_SPL_TOKEN_PURE_SUCCESS", "C_V0_ALT", "D_CPI", "E_FAILED"].every((key) => selected[key])) break;
  }

  const result = { generatedAt: new Date().toISOString(), limit, selected, observations };
  await writeJson(path.resolve(options.out || "artifacts/discovery.json"), result);
  return options.summary ? {
    generatedAt: result.generatedAt,
    limit,
    selected,
    observationCount: observations.length,
  } : result;
}

export const discoverInternals = { classify };
