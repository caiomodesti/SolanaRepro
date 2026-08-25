import path from "node:path";
import { writeJson } from "./io.js";
import { RpcClient } from "./rpc.js";

async function attempt(label, call) {
  try {
    return { label, ok: true, response: await call() };
  } catch (error) {
    return { label, ok: false, error: error.message, rpcError: error.rpcError || null };
  }
}

function accountFingerprint(response) {
  const account = response?.value;
  if (!account) return null;
  return {
    contextSlot: response.context?.slot,
    lamports: account.lamports,
    owner: account.owner,
    executable: account.executable,
    dataBase64: account.data?.[0] || null,
  };
}

export async function probeHistoricalAccountState(pubkey, originalSlot, { rpcUrl, options = {} }) {
  const rpc = new RpcClient(rpcUrl);
  const currentSlot = await rpc.call("getSlot", [{ commitment: "confirmed" }]);
  const calls = await Promise.all([
    attempt("current", () => rpc.call("getAccountInfo", [pubkey, { commitment: "confirmed", encoding: "base64" }])),
    attempt("minContextSlot=original", () => rpc.call("getAccountInfo", [pubkey, { commitment: "confirmed", encoding: "base64", minContextSlot: originalSlot }])),
    attempt("nonstandard slot=original", () => rpc.call("getAccountInfo", [pubkey, { commitment: "confirmed", encoding: "base64", slot: originalSlot }])),
    attempt("minContextSlot=future", () => rpc.call("getAccountInfo", [pubkey, { commitment: "confirmed", encoding: "base64", minContextSlot: currentSlot + 10_000 }])),
  ]);
  const result = {
    generatedAt: new Date().toISOString(),
    pubkey,
    originalSlot,
    currentSlot,
    slotDistance: currentSlot - originalSlot,
    probes: calls.map((call) => ({ ...call, fingerprint: call.ok ? accountFingerprint(call.response) : null })),
    conclusion: "standard getAccountInfo has no historical slot selector; minContextSlot constrains node freshness, not returned account version",
  };
  await writeJson(path.resolve(options.out || "artifacts/historical-account-state-experiment.json"), result);
  return result;
}
