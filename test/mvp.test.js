import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { validateBundle } from "../src/bundle-validation.js";
import { compareReplay } from "../src/compare.js";
import { runtimeCompatibility, evaluateEligibility } from "../src/eligibility.js";
import { normalizeBundlePath } from "../src/integrity.js";
import { readJson } from "../src/io.js";
import { FixtureProvider, HistoricalStateProvider, SnapshotProvider, StandardRpcProvider } from "../src/historical-state-provider.js";
import { createImmutableSourceManifest } from "../src/provider-contract.js";
import { createBundle } from "../src/bundle.js";

const signatures = {
  system: "2aCEdK4E5AbJoqBXay31frSRQC2BWxwjqqWiJ9r5m6WFTPZSQsXfZ3HbF3YHX6TQFF32kJrTSbcqjWkXKGbC5hvV",
  spl: "3JDNbXB5Wwp9h9ocqMFxcPXAU3kN8KNrvJgiL8ksieWFk43rfAYDzAWSndzqtsR4vC1GckbotLtoG75jPUV8BNfv",
  failure: "mThLKQEAhXHzHxozzWm8ZnhX5YZoSprNfzV5zaMrRMh9UNweAYiwFNbNX2E5gfoWP5zu4pG5LrohSgb6awZ2mYo",
  alt: "5MEcdGqvxFnTY82f61nj1LHHycUpMvzWC5X9eSBYedbJpd7Qa7XncjvPZakBbSFE7LoV4rhU7HtJJB8K4V1WqrwJ",
  cpi: "54b9hP8NQgRJmEss1SR4CnoNDJadymC7JavnKE773pF1WXGanrtpAX2grrd2tDPWEn9aDFiWcogYV9B46uHuVmpB",
};

function bundle(name) {
  return path.resolve("artifacts", signatures[name], "bundle");
}

test("historical state providers declare capabilities and preserve provenance", async () => {
  assert.throws(() => new HistoricalStateProvider("bad"), /abstract/);
  const rpc = new StandardRpcProvider("https://example.invalid", { rpcClient: { call() { throw new Error("unused"); } } });
  assert.equal(rpc.capabilities.arbitraryHistoricalAccountState, false);

  const pubkey = "11111111111111111111111111111111";
  const account = { lamports: 1, owner: pubkey, data: ["", "base64"], executable: false, rentEpoch: 0 };
  const fixtureContent = { accounts: { [`42:${pubkey}`]: account } };
  const fixture = new FixtureProvider({
    ...fixtureContent,
    manifest: createImmutableSourceManifest(fixtureContent, { sourceId: "mvp-test" }),
  });
  const result = await fixture.getAccountsAtSlot([pubkey], 42);
  assert.equal(result.provenance, "PROVEN");
  assert.deepEqual(result.values[0].account, account);
  const snapshotContent = { accounts: {} };
  const snapshot = new SnapshotProvider({
    ...snapshotContent,
    manifest: createImmutableSourceManifest(snapshotContent, { sourceType: "snapshot", sourceId: "empty-snapshot" }),
  });
  assert.equal(snapshot.name, "snapshot");
});

test("standard RPC provider labels minContextSlot account observations CURRENT_ONLY", async () => {
  const calls = [];
  const provider = new StandardRpcProvider("https://example.invalid", {
    rpcClient: {
      async call(method, params) {
        calls.push({ method, params });
        return {
          context: { slot: 50, apiVersion: "test" },
          value: [{ lamports: 1, owner: "11111111111111111111111111111111", data: ["", "base64"], executable: false }],
        };
      },
    },
  });
  const result = await provider.getAccountsAtSlot(["11111111111111111111111111111111"], 42);
  assert.equal(result.provenance, "CURRENT_ONLY");
  assert.equal(result.values[0].provenance, "CURRENT_ONLY");
  assert.equal(calls[0].params[1].minContextSlot, 42);
  assert.match(result.semantics, /NOT historical/);
});

test("bundle builder serializes a clean v0.1 bundle that validates", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "solrepro-build-"));
  try {
    const out = path.join(root, "bundle");
    await createBundle(path.resolve("artifacts", signatures.system), { options: { out } });
    const validated = await validateBundle(out);
    assert.equal(validated.manifest.schemaVersion, "0.1");
    assert.equal(validated.manifest.stateProvider.name, "standard-rpc");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function temporaryBundle(name) {
  const root = await mkdtemp(path.join(os.tmpdir(), "solrepro-test-"));
  const target = path.join(root, "bundle");
  await cp(bundle(name), target, { recursive: true });
  return { root, target };
}

test("supported public bundles validate with explicit provenance", async () => {
  for (const name of ["system", "spl", "failure"]) {
    const result = await validateBundle(bundle(name));
    assert.equal(result.manifest.eligibility, "SUPPORTED");
    assert.equal(result.provenance.summary.CURRENT_ONLY, 0);
    assert.equal(result.provenance.summary.UNKNOWN, 0);
  }
});

test("ALT and CPI fixtures are rejected with stable reason codes", async () => {
  const alt = await validateBundle(bundle("alt"));
  const cpi = await validateBundle(bundle("cpi"));
  assert.equal(alt.manifest.eligibility, "UNSUPPORTED");
  assert.ok(alt.manifest.eligibilityReasons.some((item) => item.code === "UNSUPPORTED_ALT_HISTORICAL_STATE"));
  assert.ok(cpi.manifest.eligibilityReasons.some((item) => item.code === "UNSUPPORTED_PROGRAM_PROVENANCE"));
});

test("unknown transaction class and relevant readonly CURRENT_ONLY state are unsupported", () => {
  const result = evaluateEligibility({
    transactionClass: "UNSUPPORTED_TRANSACTION_CLASS",
    accounts: [{ pubkey: "readonly", relevant: true, provenance: "CURRENT_ONLY" }],
    programs: [],
    lookupTables: [],
  });
  assert.equal(result.status, "UNSUPPORTED");
  assert.deepEqual(result.reasons.map((item) => item.code), [
    "UNSUPPORTED_TRANSACTION_CLASS",
    "UNSUPPORTED_ACCOUNT_PRESTATE",
  ]);
});

test("runtime mismatch is rejected", () => {
  const result = runtimeCompatibility({ runtime: { backend: "LiteSVM", version: "99", agave: "99" } });
  assert.equal(result.compatible, false);
  assert.equal(result.reasons[0].code, "UNSUPPORTED_RUNTIME_MISMATCH");
});

test("schema mismatch, missing files and altered bytes fail validation", async (t) => {
  for (const scenario of ["schema", "missing", "hash"]) {
    await t.test(scenario, async () => {
      const { root, target } = await temporaryBundle("system");
      try {
        if (scenario === "schema") {
          const manifest = await readJson(path.join(target, "manifest.json"));
          manifest.schemaVersion = "9.9";
          await writeFile(path.join(target, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
        } else if (scenario === "missing") {
          await unlink(path.join(target, "expected.json"));
        } else {
          await writeFile(path.join(target, "transaction.json"), "{}\n");
        }
        await assert.rejects(() => validateBundle(target), (error) =>
          error.code === (scenario === "schema" ? "INVALID_SCHEMA_VERSION" : "CORRUPTED_BUNDLE"));
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });
  }
});

test("bundle paths reject traversal and absolute paths", () => {
  for (const value of ["../secret", "accounts/../../secret", "/etc/passwd", "C:\\secret"] ) {
    assert.throws(() => normalizeBundlePath(value), { code: "CORRUPTED_BUNDLE" });
  }
});

async function comparisonWith(name, mutate) {
  const original = await readJson(path.join(bundle(name), "replay.json"));
  const replay = structuredClone(original);
  mutate(replay);
  const root = await mkdtemp(path.join(os.tmpdir(), "solrepro-compare-"));
  const replayFile = path.join(root, "replay.json");
  await writeFile(replayFile, `${JSON.stringify(replay, null, 2)}\n`);
  try {
    return await compareReplay(bundle(name), replayFile, { options: { out: path.join(root, "comparison.json") } });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("comparator detects exact, log, compute, balance, token and error outcomes", async () => {
  assert.equal((await comparisonWith("system", () => {})).status, "EXACT");
  assert.equal((await comparisonWith("system", (replay) => replay.logs.pop())).status, "PARTIAL");
  assert.equal((await comparisonWith("system", (replay) => { replay.computeUnitsConsumed += 1; })).status, "HIGH_FIDELITY");
  assert.equal((await comparisonWith("system", (replay) => {
    replay.postAccounts.find((account) => account.pubkey === "69SNcRC8NqjHBSXEcugCN5oFKRQoKmddmWzZYc3tqtxk").lamports += 1;
  })).status, "PARTIAL");
  assert.equal((await comparisonWith("system", (replay) => { replay.success = false; replay.error = "Changed"; })).status, "FAILED");
  const token = await comparisonWith("spl", (replay) => {
    const account = replay.postAccounts.find((candidate) => candidate.dataBase64 && Buffer.from(candidate.dataBase64, "base64").length === 165);
    const bytes = Buffer.from(account.dataBase64, "base64");
    bytes.writeBigUInt64LE(bytes.readBigUInt64LE(64) + 1n, 64);
    account.dataBase64 = bytes.toString("base64");
  });
  assert.equal(token.status, "PARTIAL");
  assert.equal(token.checks.postTokenBalances.exact, false);
});

test("runtime-only readonly post-account differences are non-semantic", async () => {
  const result = await comparisonWith("system", (replay) => {
    replay.postAccounts.push({
      pubkey: "ComputeBudget111111111111111111111111111111",
      lamports: 999,
      owner: "NativeLoader1111111111111111111111111111111",
      executable: true,
      dataBase64: "",
    });
  });
  assert.equal(result.status, "EXACT");
});
