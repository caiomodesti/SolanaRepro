import { chunks, RpcClient } from "./rpc.js";
import {
  ACCOUNT_STATE_CAPABILITY,
  SLOT_SEMANTICS,
  assertProviderConformance,
  normalizeProviderCapabilities,
  validateImmutableSourceManifest,
} from "./provider-contract.js";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) deepFreeze(item);
  return Object.freeze(value);
}

function aggregate(values) {
  if (values.some((item) => item.provenance === "UNKNOWN")) return "UNKNOWN";
  if (values.some((item) => item.provenance === "CURRENT_ONLY")) return "CURRENT_ONLY";
  return "PROVEN";
}

export class HistoricalStateProvider {
  constructor(name, capabilities = {}) {
    if (new.target === HistoricalStateProvider) throw new TypeError("HistoricalStateProvider is abstract");
    if (typeof name !== "string" || !name.trim()) throw new TypeError("HistoricalStateProvider name is required");
    Object.defineProperties(this, {
      name: { value: name, enumerable: true, writable: false, configurable: false },
      capabilities: { value: normalizeProviderCapabilities(capabilities), enumerable: true, writable: false, configurable: false },
    });
    this.source = null;
  }

  describe() { return { name: this.name, capabilities: this.capabilities, source: this.source }; }

  async getTransaction() { throw new Error(`${this.name}: getTransaction is not implemented`); }
  async getAccountsAtSlot() { throw new Error(`${this.name}: getAccountsAtSlot is not implemented`); }
  async getAccountAtSlot() { throw new Error(`${this.name}: getAccountAtSlot is not implemented`); }
  async getBlock() { throw new Error(`${this.name}: getBlock is not implemented`); }
}

export class StandardRpcProvider extends HistoricalStateProvider {
  constructor(rpcUrl, options = {}) {
    super("standard-rpc", {
      transactionHistory: true,
      accountState: ACCOUNT_STATE_CAPABILITY.CURRENT_ONLY,
      programBytes: ACCOUNT_STATE_CAPABILITY.CURRENT_ONLY,
      slotSemantics: SLOT_SEMANTICS.MIN_CONTEXT,
    });
    this.rpc = options.rpcClient || new RpcClient(rpcUrl, options);
    assertProviderConformance(this);
  }

  getTransaction(signature, encoding) {
    return this.rpc.call("getTransaction", [signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
      encoding,
    }]);
  }

  async getAccountsAtSlot(pubkeys, slot) {
    const values = [];
    const contextSlots = [];
    const apiVersions = new Set();
    for (const group of chunks(pubkeys, 100)) {
      const response = await this.rpc.call("getMultipleAccounts", [group, {
        commitment: "confirmed",
        encoding: "base64",
        minContextSlot: slot,
      }]);
      response.value.forEach((account, index) => values.push({
        pubkey: group[index],
        account,
        provenance: account == null ? "UNKNOWN" : "CURRENT_ONLY",
      }));
      contextSlots.push(response.context.slot);
      if (response.context.apiVersion) apiVersions.add(response.context.apiVersion);
    }
    return {
      provider: this.name,
      provenance: aggregate(values),
      method: "getMultipleAccounts",
      semantics: "current state observed at or after minContextSlot; NOT historical state at originalSlot",
      requestedSlot: slot,
      minContextSlot: slot,
      capturedAtSlot: contextSlots.length ? Math.max(...contextSlots) : null,
      apiVersions: [...apiVersions],
      source: { type: "standard-rpc", verified: false },
      values,
    };
  }

  async getAccountAtSlot(pubkey, slot) {
    const response = await this.rpc.call("getAccountInfo", [pubkey, {
      commitment: "confirmed",
      encoding: "base64",
      minContextSlot: slot,
    }]);
    return {
      provider: this.name,
      provenance: response.value == null ? "UNKNOWN" : "CURRENT_ONLY",
      requestedSlot: slot,
      capturedAtSlot: response.context.slot,
      source: { type: "standard-rpc", verified: false },
      account: response.value,
    };
  }

  getBlock(slot) {
    return this.rpc.call("getBlock", [slot, {
      commitment: "confirmed",
      transactionDetails: "none",
      rewards: false,
      maxSupportedTransactionVersion: 0,
    }]);
  }
}

export class FixtureProvider extends HistoricalStateProvider {
  constructor(fixtures = {}, options = {}) {
    const name = options.name || "fixture";
    const sourceType = options.sourceType || "fixture";
    const content = structuredClone(Object.fromEntries(Object.entries(fixtures).filter(([key]) => key !== "manifest")));
    const manifestValidation = validateImmutableSourceManifest(fixtures.manifest, content, sourceType);
    super(name, {
      transactionHistory: manifestValidation.valid,
      arbitraryHistoricalAccountState: manifestValidation.valid,
      historicalProgramBytes: manifestValidation.valid,
      accountState: manifestValidation.valid ? ACCOUNT_STATE_CAPABILITY.HISTORICAL_EXACT : ACCOUNT_STATE_CAPABILITY.NONE,
      programBytes: manifestValidation.valid ? ACCOUNT_STATE_CAPABILITY.HISTORICAL_EXACT : ACCOUNT_STATE_CAPABILITY.NONE,
      slotSemantics: manifestValidation.valid ? SLOT_SEMANTICS.EXACT : SLOT_SEMANTICS.NONE,
      sourceIdentity: manifestValidation.valid,
      immutableEvidence: manifestValidation.valid,
    });
    const source = manifestValidation.valid
      ? Object.freeze({
          type: sourceType,
          id: fixtures.manifest.sourceId,
          contentSha256: fixtures.manifest.contentSha256,
          verified: true,
        })
      : Object.freeze({ type: sourceType, id: null, verified: false, errors: manifestValidation.errors });
    Object.defineProperties(this, {
      fixtures: { value: deepFreeze(content), enumerable: false, writable: false, configurable: false },
      manifestValidation: { value: manifestValidation, enumerable: true, writable: false, configurable: false },
      source: { value: source, enumerable: true, writable: false, configurable: false },
    });
    assertProviderConformance(this);
  }

  async getTransaction(signature, encoding) {
    if (!this.manifestValidation.valid) return null;
    return this.fixtures.transactions?.[signature]?.[encoding] ?? null;
  }
  async getAccountsAtSlot(pubkeys, slot) {
    const trusted = this.manifestValidation.valid;
    const values = pubkeys.map((pubkey) => {
      const account = trusted ? this.fixtures.accounts?.[`${slot}:${pubkey}`] ?? null : null;
      return { pubkey, account, provenance: account == null ? "UNKNOWN" : "PROVEN" };
    });
    return {
      provider: this.name,
      provenance: aggregate(values),
      method: this.name,
      semantics: "explicit immutable fixture selected for the requested slot",
      requestedSlot: slot,
      minContextSlot: slot,
      capturedAtSlot: trusted ? slot : null,
      apiVersions: [],
      source: this.source,
      values,
    };
  }
  async getAccountAtSlot(pubkey, slot) {
    const account = this.manifestValidation.valid ? this.fixtures.accounts?.[`${slot}:${pubkey}`] ?? null : null;
    return {
      provider: this.name,
      provenance: account == null ? "UNKNOWN" : "PROVEN",
      requestedSlot: slot,
      capturedAtSlot: this.manifestValidation.valid ? slot : null,
      source: this.source,
      account,
    };
  }
  async getBlock(slot) { return this.manifestValidation.valid ? this.fixtures.blocks?.[slot] ?? null : null; }
}

export class SnapshotProvider extends FixtureProvider {
  constructor(snapshot = {}) {
    super(snapshot, { name: "snapshot", sourceType: "snapshot" });
  }
}
