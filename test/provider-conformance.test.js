import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FixtureProvider, HistoricalStateProvider, SnapshotProvider, StandardRpcProvider } from "../src/historical-state-provider.js";
import { inspectTransaction } from "../src/inspect.js";
import {
  ACCOUNT_STATE_CAPABILITY,
  SLOT_SEMANTICS,
  createImmutableSourceManifest,
  providerContentSha256,
  validateAccountStateResponse,
  validateProviderConformance,
  validateSingleAccountStateResponse,
} from "../src/provider-contract.js";

const pubkey = "11111111111111111111111111111111";
const account = Object.freeze({ lamports: 1, owner: pubkey, data: ["", "base64"], executable: false, rentEpoch: 0 });

function fixtureAt(slot = 42) {
  const content = { accounts: { [`${slot}:${pubkey}`]: account }, blocks: { [slot]: { blockHeight: 7 } } };
  return {
    ...content,
    manifest: createImmutableSourceManifest(content, { sourceId: `fixture-${slot}` }),
  };
}

test("fixture content hashes are canonical and bind all fixture data", () => {
  const first = { accounts: { b: { value: 2 }, a: { value: 1 } }, blocks: { 42: { z: 2, a: 1 } } };
  const reordered = { blocks: { 42: { a: 1, z: 2 } }, accounts: { a: { value: 1 }, b: { value: 2 } } };
  assert.equal(providerContentSha256(first), providerContentSha256(reordered));
  assert.notEqual(providerContentSha256(first), providerContentSha256({ ...reordered, blocks: { 42: { a: 1, z: 3 } } }));
});

test("fixture providers without a verified immutable manifest fail closed", async () => {
  const provider = new FixtureProvider({ accounts: { [`42:${pubkey}`]: account } });
  assert.equal(provider.capabilities.accountState, ACCOUNT_STATE_CAPABILITY.NONE);
  assert.equal(provider.capabilities.arbitraryHistoricalAccountState, false);
  assert.equal(provider.source.verified, false);
  const response = await provider.getAccountsAtSlot([pubkey], 42);
  assert.equal(response.provenance, "UNKNOWN");
  assert.equal(response.values[0].account, null);
  assert.equal(response.values[0].provenance, "UNKNOWN");
  assert.equal(validateAccountStateResponse(provider, response, { pubkeys: [pubkey], slot: 42 }).valid, true);
});

test("verified fixture providers preserve source identity and exact slot semantics", async () => {
  const fixtures = fixtureAt();
  const provider = new FixtureProvider(fixtures);
  assert.equal(provider.capabilities.accountState, ACCOUNT_STATE_CAPABILITY.HISTORICAL_EXACT);
  assert.equal(provider.capabilities.slotSemantics, SLOT_SEMANTICS.EXACT);
  assert.equal(provider.source.id, "fixture-42");
  assert.equal(validateProviderConformance(provider).valid, true);

  fixtures.accounts[`42:${pubkey}`] = { ...account, lamports: 999 };
  const response = await provider.getAccountsAtSlot([pubkey], 42);
  assert.equal(response.values[0].account.lamports, 1);
  assert.equal(response.values[0].provenance, "PROVEN");
  assert.equal(validateAccountStateResponse(provider, response, { pubkeys: [pubkey], slot: 42 }).valid, true);
  assert.throws(() => { provider.fixtures = {}; }, TypeError);
  assert.throws(() => { provider.manifestValidation = { valid: false }; }, TypeError);
  assert.throws(() => { provider.source = { verified: false }; }, TypeError);
  assert.throws(() => { provider.capabilities = {}; }, TypeError);
});

test("verified fixtures never treat an unlisted account as proven absent", async () => {
  const provider = new FixtureProvider(fixtureAt());
  const missing = "ComputeBudget111111111111111111111111111111";
  const response = await provider.getAccountsAtSlot([pubkey, missing], 42);
  assert.equal(response.provenance, "UNKNOWN");
  assert.deepEqual(response.values.map((item) => item.provenance), ["PROVEN", "UNKNOWN"]);
  assert.equal(validateAccountStateResponse(provider, response, { pubkeys: [pubkey, missing], slot: 42 }).valid, true);
});

test("tampered fixture contents and source-type confusion fail closed", async () => {
  const tampered = fixtureAt();
  tampered.accounts[`42:${pubkey}`] = { ...account, lamports: 2 };
  const fixture = new FixtureProvider(tampered);
  assert.equal(fixture.source.verified, false);
  assert.equal((await fixture.getAccountAtSlot(pubkey, 42)).provenance, "UNKNOWN");

  const fixtureManifest = fixtureAt();
  const snapshot = new SnapshotProvider(fixtureManifest);
  assert.equal(snapshot.source.verified, false);
  assert.equal(snapshot.capabilities.accountState, ACCOUNT_STATE_CAPABILITY.NONE);
});

test("account response validation rejects forged provenance and slot identity", async () => {
  const provider = new FixtureProvider(fixtureAt());
  const valid = await provider.getAccountsAtSlot([pubkey], 42);
  const wrongSlot = structuredClone(valid);
  wrongSlot.capturedAtSlot = 43;
  assert.equal(validateAccountStateResponse(provider, wrongSlot, { pubkeys: [pubkey], slot: 42 }).valid, false);

  const forgedMissing = structuredClone(valid);
  forgedMissing.values[0].account = null;
  assert.equal(validateAccountStateResponse(provider, forgedMissing, { pubkeys: [pubkey], slot: 42 }).valid, false);
  const single = await provider.getAccountAtSlot(pubkey, 42);
  assert.equal(validateSingleAccountStateResponse(provider, single, { pubkey, slot: 42 }).valid, true);
  assert.equal(validateSingleAccountStateResponse(provider, { ...single, capturedAtSlot: 41 }, { pubkey, slot: 42 }).valid, false);
});

test("standard RPC missing observations remain UNKNOWN rather than historical absence", async () => {
  const provider = new StandardRpcProvider("https://example.invalid", {
    rpcClient: { async call() { return { context: { slot: 50 }, value: [null] }; } },
  });
  const response = await provider.getAccountsAtSlot([pubkey], 42);
  assert.equal(response.provenance, "UNKNOWN");
  assert.equal(response.values[0].provenance, "UNKNOWN");
  assert.equal(validateAccountStateResponse(provider, response, { pubkeys: [pubkey], slot: 42 }).valid, true);
});

test("provider conformance rejects contradictory historical capability claims", () => {
  class ContradictoryProvider extends HistoricalStateProvider {
    constructor() {
      super("contradictory", {
        arbitraryHistoricalAccountState: true,
        accountState: ACCOUNT_STATE_CAPABILITY.CURRENT_ONLY,
        slotSemantics: SLOT_SEMANTICS.MIN_CONTEXT,
      });
    }
  }
  const result = validateProviderConformance(new ContradictoryProvider());
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("contradicts")));
});

test("transaction inspection enforces account response conformance", async () => {
  class ForgedProvider extends HistoricalStateProvider {
    constructor() {
      super("forged", {
        transactionHistory: true,
        arbitraryHistoricalAccountState: true,
        accountState: ACCOUNT_STATE_CAPABILITY.HISTORICAL_EXACT,
        slotSemantics: SLOT_SEMANTICS.EXACT,
        sourceIdentity: true,
        immutableEvidence: true,
      });
      this.source = { type: "test", id: "forged", verified: true };
    }
    async getTransaction(_signature, encoding) {
      if (encoding === "base64") return { transaction: ["AA==", "base64"] };
      return {
        slot: 42,
        blockTime: null,
        version: "legacy",
        transaction: {
          signatures: ["signature"],
          message: {
            accountKeys: [pubkey],
            header: { numRequiredSignatures: 1, numReadonlySignedAccounts: 0, numReadonlyUnsignedAccounts: 0 },
            instructions: [],
          },
        },
        meta: {
          err: null,
          fee: 5000,
          preBalances: [1],
          postBalances: [1],
          preTokenBalances: [],
          postTokenBalances: [],
          logMessages: [],
          innerInstructions: [],
          loadedAddresses: { writable: [], readonly: [] },
        },
      };
    }
    async getAccountsAtSlot(pubkeys, slot) {
      return {
        provider: this.name,
        provenance: "PROVEN",
        requestedSlot: slot,
        capturedAtSlot: slot - 1,
        source: this.source,
        values: pubkeys.map((key) => ({ pubkey: key, account, provenance: "PROVEN" })),
      };
    }
    async getAccountAtSlot() { return null; }
    async getBlock() { return null; }
  }

  const root = await mkdtemp(path.join(os.tmpdir(), "solrepro-provider-inspect-"));
  try {
    await assert.rejects(
      () => inspectTransaction("signature", { provider: new ForgedProvider(), options: { out: root } }),
      /non-conforming HistoricalStateProvider response/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
