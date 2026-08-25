#!/usr/bin/env node
import { existsSync } from "node:fs";
import path from "node:path";
import { isTransactionSignature } from "./base58.js";
import { DEFAULT_RPC_URL, TOOL_VERSION } from "./constants.js";

export function parseArgs(argv) {
  const positional = [];
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      positional.push(value);
      continue;
    }
    const [rawKey, inline] = value.slice(2).split("=", 2);
    if (inline !== undefined) options[rawKey] = inline;
    else if (argv[index + 1] && !argv[index + 1].startsWith("--")) options[rawKey] = argv[++index];
    else options[rawKey] = true;
  }
  return { positional, options };
}

function usage() {
  return `solrepro ${TOOL_VERSION} — forensic transaction reproduction for Solana

Usage:
  solrepro capture <signature> [--rpc <url>] [--out <repros-dir>] [--json]
  solrepro inspect <bundle-dir|signature> [--rpc <url>] [--json]
  solrepro replay <bundle-dir> [--json]
  solrepro compare <bundle-dir> [replay.json] [--json]
  solrepro assert <bundle-dir> [--fresh] [--json]

Research commands retained from the feasibility spike:
  solrepro discover [--rpc <url>] [--limit <n>]
  solrepro historical-probe <pubkey> <slot> [--rpc <url>]
  solrepro bundle <capture-artifact-dir> [--out <bundle-dir>]

SOLANA_RPC_URL supplies an endpoint without persisting it in a bundle.`;
}

function print(value, formatted, options) {
  console.log(options.json ? JSON.stringify(value, null, 2) : formatted(value));
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const { positional, options } = parseArgs(rest);
  const context = { rpcUrl: options.rpc || DEFAULT_RPC_URL, options };
  if (!command || command === "help" || command === "--help" || command === "-h") return console.log(usage());
  if (command === "version" || command === "--version" || command === "-v") return console.log(TOOL_VERSION);

  if (command === "capture") {
    if (!positional[0]) throw new Error("capture requires a transaction signature");
    const [{ captureTransaction }, { formatCapture }] = await Promise.all([import("./capture.js"), import("./presentation.js")]);
    return print(await captureTransaction(positional[0], context), formatCapture, options);
  }
  if (command === "inspect") {
    if (!positional[0]) throw new Error("inspect requires a bundle directory or transaction signature");
    if (existsSync(path.resolve(positional[0]))) {
      const [{ inspectBundle }, { formatInspection }] = await Promise.all([import("./bundle-inspect.js"), import("./presentation.js")]);
      return print(await inspectBundle(positional[0]), formatInspection, options);
    }
    if (!isTransactionSignature(positional[0])) throw new Error("inspect target is neither a bundle path nor a valid signature");
    const { inspectTransaction } = await import("./inspect.js");
    return console.log(JSON.stringify(await inspectTransaction(positional[0], context), null, 2));
  }
  if (command === "replay") {
    if (!positional[0]) throw new Error("replay requires a bundle directory");
    const [{ replayBundle }, { compareReplay }, { formatComparison }] = await Promise.all([
      import("./replay.js"), import("./compare.js"), import("./presentation.js"),
    ]);
    const bundle = path.resolve(positional[0]);
    const replay = await replayBundle(bundle, context);
    if (replay.status === "UNSUPPORTED") return print({ status: "UNSUPPORTED", reasons: replay.reasons }, formatComparison, options);
    return print(await compareReplay(bundle, path.join(bundle, "replay.json"), context), formatComparison, options);
  }
  if (command === "compare") {
    if (!positional[0]) throw new Error("compare requires a bundle directory");
    const bundle = path.resolve(positional[0]);
    const replayFile = path.resolve(positional[1] || path.join(bundle, "replay.json"));
    if (!existsSync(replayFile)) {
      const { replayBundle } = await import("./replay.js");
      await replayBundle(bundle, context);
    }
    const [{ compareReplay }, { formatComparison }] = await Promise.all([import("./compare.js"), import("./presentation.js")]);
    return print(await compareReplay(bundle, replayFile, context), formatComparison, options);
  }
  if (command === "assert") {
    if (!positional[0]) throw new Error("assert requires a bundle directory");
    const [{ assertBundle }, { formatAssertion }] = await Promise.all([import("./assert.js"), import("./presentation.js")]);
    return print(await assertBundle(positional[0], context), formatAssertion, options);
  }
  if (command === "discover") {
    const { discoverCases } = await import("./discover.js");
    return console.log(JSON.stringify(await discoverCases({ ...context, limit: Number(options.limit || 100) }), null, 2));
  }
  if (command === "historical-probe") {
    if (!positional[0] || !positional[1]) throw new Error("historical-probe requires a pubkey and original slot");
    const { probeHistoricalAccountState } = await import("./historical-probe.js");
    return console.log(JSON.stringify(await probeHistoricalAccountState(positional[0], Number(positional[1]), context), null, 2));
  }
  if (command === "bundle") {
    if (!positional[0]) throw new Error("bundle requires a capture artifact directory");
    const { createBundle } = await import("./bundle.js");
    return console.log(JSON.stringify(await createBundle(positional[0], context), null, 2));
  }
  throw new Error(`unknown command: ${command}\n\n${usage()}`);
}

main().catch((error) => {
  console.error(error.code ? `${error.code}: ${error.message}` : (error.stack || error.message));
  process.exitCode = 1;
});
