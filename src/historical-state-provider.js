import { chunks, RpcClient } from "./rpc.js";

export class HistoricalStateProvider {
  constructor(name, capabilities = {}) {
    if (new.target === HistoricalStateProvider) throw new TypeError("HistoricalStateProvider is abstract");
    this.name = name;
    this.capabilities = Object.freeze({
      transactionHistory: false,
      arbitraryHistoricalAccountState: false,
      historicalProgramBytes: false,
      ...capabilities,
    });
  }

  async getTransaction() { throw new Error(`${this.name}: getTransaction is not implemented`); }
  async getAccountsAtSlot() { throw new Error(`${this.name}: getAccountsAtSlot is not implemented`); }
  async getAccountAtSlot() { throw new Error(`${this.name}: getAccountAtSlot is not implemented`); }
  async getBlock() { throw new Error(`${this.name}: getBlock is not implemented`); }
}

export class StandardRpcProvider extends HistoricalStateProvider {
  constructor(rpcUrl, options = {}) {
    super("standard-rpc", { transactionHistory: true });
    this.rpc = options.rpcClient || new RpcClient(rpcUrl, options);
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
      response.value.forEach((account, index) => values.push({ pubkey: group[index], account }));
      contextSlots.push(response.context.slot);
      if (response.context.apiVersion) apiVersions.add(response.context.apiVersion);
    }
    return {
      provider: this.name,
      provenance: "CURRENT_ONLY",
      method: "getMultipleAccounts",
      semantics: "current state observed at or after minContextSlot; NOT historical state at originalSlot",
      minContextSlot: slot,
      capturedAtSlot: contextSlots.length ? Math.max(...contextSlots) : null,
      apiVersions: [...apiVersions],
      values,
    };
  }

  async getAccountAtSlot(pubkey, slot) {
    const response = await this.rpc.call("getAccountInfo", [pubkey, {
      commitment: "confirmed",
      encoding: "base64",
      minContextSlot: slot,
    }]);
    return { provider: this.name, provenance: "CURRENT_ONLY", capturedAtSlot: response.context.slot, account: response.value };
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
  constructor(fixtures = {}) {
    super("fixture", {
      transactionHistory: true,
      arbitraryHistoricalAccountState: true,
      historicalProgramBytes: true,
    });
    this.fixtures = fixtures;
  }

  async getTransaction(signature, encoding) { return this.fixtures.transactions?.[signature]?.[encoding] ?? null; }
  async getAccountsAtSlot(pubkeys, slot) {
    return {
      provider: this.name,
      provenance: "PROVEN",
      method: "fixture",
      semantics: "explicit immutable fixture selected for the requested slot",
      minContextSlot: slot,
      capturedAtSlot: slot,
      apiVersions: [],
      values: pubkeys.map((pubkey) => ({ pubkey, account: this.fixtures.accounts?.[`${slot}:${pubkey}`] ?? null })),
    };
  }
  async getAccountAtSlot(pubkey, slot) {
    return { provider: this.name, provenance: "PROVEN", capturedAtSlot: slot, account: this.fixtures.accounts?.[`${slot}:${pubkey}`] ?? null };
  }
  async getBlock(slot) { return this.fixtures.blocks?.[slot] ?? null; }
}

export class SnapshotProvider extends FixtureProvider {
  constructor(snapshot = {}) {
    super(snapshot);
    this.name = "snapshot";
  }
}
