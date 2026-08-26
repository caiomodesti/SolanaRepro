import { createHash } from "node:crypto";

export const PROVIDER_CONTRACT_VERSION = "0.1";

export const ACCOUNT_STATE_CAPABILITY = Object.freeze({
  NONE: "NONE",
  CURRENT_ONLY: "CURRENT_ONLY",
  HISTORICAL_EXACT: "HISTORICAL_EXACT",
});

export const SLOT_SEMANTICS = Object.freeze({
  NONE: "NONE",
  MIN_CONTEXT: "MIN_CONTEXT",
  EXACT: "EXACT",
});

const PROVENANCE = new Set(["PROVEN", "CURRENT_ONLY", "UNKNOWN"]);

function canonicalize(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  throw new TypeError("provider fixture content must be JSON-compatible");
}

function fixtureContent(fixtures = {}) {
  const { manifest: _manifest, ...content } = fixtures;
  return content;
}

export function providerContentSha256(fixtures) {
  const canonical = JSON.stringify(canonicalize(fixtureContent(fixtures)));
  return createHash("sha256").update(canonical).digest("hex");
}

export function createImmutableSourceManifest(fixtures, { sourceType = "fixture", sourceId } = {}) {
  if (typeof sourceId !== "string" || !sourceId.trim()) throw new TypeError("sourceId is required");
  return Object.freeze({
    schemaVersion: PROVIDER_CONTRACT_VERSION,
    sourceType,
    sourceId: sourceId.trim(),
    contentSha256: providerContentSha256(fixtures),
  });
}

export function validateImmutableSourceManifest(manifest, fixtures, expectedSourceType) {
  const errors = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    errors.push("immutable source manifest is required");
  } else {
    if (manifest.schemaVersion !== PROVIDER_CONTRACT_VERSION) errors.push("unsupported source manifest schemaVersion");
    if (manifest.sourceType !== expectedSourceType) errors.push(`sourceType must be ${expectedSourceType}`);
    if (typeof manifest.sourceId !== "string" || !manifest.sourceId.trim() || manifest.sourceId.length > 200) {
      errors.push("sourceId must be a non-empty string no longer than 200 characters");
    }
    if (!/^[a-f0-9]{64}$/.test(manifest.contentSha256 || "")) errors.push("contentSha256 must be a lowercase SHA-256 digest");
    else if (manifest.contentSha256 !== providerContentSha256(fixtures)) errors.push("fixture content does not match contentSha256");
  }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function normalizeProviderCapabilities(capabilities = {}) {
  const arbitraryHistoricalAccountState = capabilities.arbitraryHistoricalAccountState === true;
  const historicalProgramBytes = capabilities.historicalProgramBytes === true;
  return Object.freeze({
    contractVersion: PROVIDER_CONTRACT_VERSION,
    transactionHistory: capabilities.transactionHistory === true,
    arbitraryHistoricalAccountState,
    historicalProgramBytes,
    accountState: capabilities.accountState || (arbitraryHistoricalAccountState
      ? ACCOUNT_STATE_CAPABILITY.HISTORICAL_EXACT
      : ACCOUNT_STATE_CAPABILITY.NONE),
    programBytes: capabilities.programBytes || (historicalProgramBytes
      ? ACCOUNT_STATE_CAPABILITY.HISTORICAL_EXACT
      : ACCOUNT_STATE_CAPABILITY.NONE),
    slotSemantics: capabilities.slotSemantics || SLOT_SEMANTICS.NONE,
    sourceIdentity: capabilities.sourceIdentity === true,
    immutableEvidence: capabilities.immutableEvidence === true,
  });
}

export function validateProviderConformance(provider) {
  const errors = [];
  const capabilities = provider?.capabilities || {};
  if (!provider || typeof provider.name !== "string" || !provider.name.trim()) errors.push("provider name is required");
  if (capabilities.contractVersion !== PROVIDER_CONTRACT_VERSION) errors.push("provider contractVersion is unsupported");
  if (!Object.values(ACCOUNT_STATE_CAPABILITY).includes(capabilities.accountState)) errors.push("invalid accountState capability");
  if (!Object.values(ACCOUNT_STATE_CAPABILITY).includes(capabilities.programBytes)) errors.push("invalid programBytes capability");
  if (!Object.values(SLOT_SEMANTICS).includes(capabilities.slotSemantics)) errors.push("invalid slotSemantics capability");
  if (capabilities.arbitraryHistoricalAccountState !== (capabilities.accountState === ACCOUNT_STATE_CAPABILITY.HISTORICAL_EXACT)) {
    errors.push("arbitraryHistoricalAccountState contradicts accountState capability");
  }
  if (capabilities.historicalProgramBytes !== (capabilities.programBytes === ACCOUNT_STATE_CAPABILITY.HISTORICAL_EXACT)) {
    errors.push("historicalProgramBytes contradicts programBytes capability");
  }
  if (capabilities.accountState === ACCOUNT_STATE_CAPABILITY.HISTORICAL_EXACT) {
    if (capabilities.slotSemantics !== SLOT_SEMANTICS.EXACT) errors.push("historical account state requires EXACT slot semantics");
    if (!capabilities.sourceIdentity) errors.push("historical account state requires source identity");
    if (!capabilities.immutableEvidence) errors.push("historical account state requires immutable evidence");
  }
  if (capabilities.accountState === ACCOUNT_STATE_CAPABILITY.CURRENT_ONLY && capabilities.slotSemantics !== SLOT_SEMANTICS.MIN_CONTEXT) {
    errors.push("current account observations require MIN_CONTEXT slot semantics");
  }
  for (const method of ["describe", "getTransaction", "getAccountsAtSlot", "getAccountAtSlot", "getBlock"]) {
    if (typeof provider?.[method] !== "function") errors.push(`${method} is required`);
  }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function assertProviderConformance(provider) {
  const result = validateProviderConformance(provider);
  if (!result.valid) throw new TypeError(`non-conforming HistoricalStateProvider: ${result.errors.join("; ")}`);
  return provider;
}

function aggregateProvenance(values) {
  if (values.some((item) => item.provenance === "UNKNOWN")) return "UNKNOWN";
  if (values.some((item) => item.provenance === "CURRENT_ONLY")) return "CURRENT_ONLY";
  return "PROVEN";
}

export function validateAccountStateResponse(provider, response, { pubkeys, slot }) {
  const errors = [];
  const values = Array.isArray(response?.values) ? response.values : [];
  if (!Number.isSafeInteger(slot) || slot < 0) errors.push("requested slot must be a non-negative safe integer");
  if (response?.provider !== provider?.name) errors.push("response provider identity mismatch");
  if (response?.requestedSlot !== slot) errors.push("response requestedSlot mismatch");
  if (values.length !== pubkeys.length) errors.push("response account count mismatch");
  for (let index = 0; index < Math.min(values.length, pubkeys.length); index += 1) {
    const item = values[index];
    if (item.pubkey !== pubkeys[index]) errors.push(`response pubkey mismatch at index ${index}`);
    if (!PROVENANCE.has(item.provenance)) errors.push(`invalid provenance at index ${index}`);
    if (item.provenance === "PROVEN") {
      if (item.account == null) errors.push(`missing account cannot be PROVEN at index ${index}`);
      if (provider.capabilities.accountState !== ACCOUNT_STATE_CAPABILITY.HISTORICAL_EXACT) {
        errors.push(`provider cannot emit PROVEN historical state at index ${index}`);
      }
      if (response.capturedAtSlot !== slot) errors.push(`PROVEN state requires exact capturedAtSlot at index ${index}`);
      if (response.source?.verified !== true) errors.push(`PROVEN state requires a verified source at index ${index}`);
    }
    if (item.provenance === "CURRENT_ONLY") {
      if (provider.capabilities.accountState !== ACCOUNT_STATE_CAPABILITY.CURRENT_ONLY) {
        errors.push(`provider cannot emit CURRENT_ONLY state at index ${index}`);
      }
      if (!Number.isSafeInteger(response.capturedAtSlot) || response.capturedAtSlot < slot) {
        errors.push(`CURRENT_ONLY state must be captured at or after requested slot at index ${index}`);
      }
    }
  }
  if (values.length === pubkeys.length && values.every((item) => PROVENANCE.has(item.provenance))) {
    if (response.provenance !== aggregateProvenance(values)) errors.push("aggregate provenance does not match account results");
  }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function validateSingleAccountStateResponse(provider, response, { pubkey, slot }) {
  return validateAccountStateResponse(provider, {
    ...response,
    values: [{ pubkey, account: response?.account ?? null, provenance: response?.provenance }],
  }, { pubkeys: [pubkey], slot });
}

export const providerContractInternals = { canonicalize, fixtureContent, aggregateProvenance };
