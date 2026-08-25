import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { REASON_CODES } from "./constants.js";

const MAX_FILES = 1_000;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;
const MUTABLE_OUTPUTS = new Set(["manifest.json", "replay.json", "comparison.json"]);

export class BundleValidationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "BundleValidationError";
    this.code = code;
    this.details = details;
  }
}

export function normalizeBundlePath(value) {
  const normalized = value.replaceAll("\\", "/");
  if (!normalized || normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized)) {
    throw new BundleValidationError(REASON_CODES.CORRUPTED_BUNDLE, `unsafe bundle path: ${value}`);
  }
  const parts = normalized.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) {
    throw new BundleValidationError(REASON_CODES.CORRUPTED_BUNDLE, `unsafe bundle path: ${value}`);
  }
  return normalized;
}

export function resolveInside(root, relative) {
  const safe = normalizeBundlePath(relative);
  const absoluteRoot = path.resolve(root);
  const target = path.resolve(absoluteRoot, ...safe.split("/"));
  if (target !== absoluteRoot && !target.startsWith(`${absoluteRoot}${path.sep}`)) {
    throw new BundleValidationError(REASON_CODES.CORRUPTED_BUNDLE, `path escapes bundle: ${relative}`);
  }
  return target;
}

async function walk(root, current = root, result = []) {
  for (const item of await readdir(current, { withFileTypes: true })) {
    const absolute = path.join(current, item.name);
    const stat = await lstat(absolute);
    if (stat.isSymbolicLink()) {
      throw new BundleValidationError(REASON_CODES.CORRUPTED_BUNDLE, `symbolic links are forbidden: ${absolute}`);
    }
    if (item.isDirectory()) await walk(root, absolute, result);
    else if (item.isFile()) result.push(path.relative(root, absolute).split(path.sep).join("/"));
    else throw new BundleValidationError(REASON_CODES.CORRUPTED_BUNDLE, `unsupported filesystem entry: ${absolute}`);
  }
  return result;
}

export async function sha256File(file) {
  const bytes = await readFile(file);
  return createHash("sha256").update(bytes).digest("hex");
}

export function sha256Value(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export async function buildIntegrityIndex(bundleDir) {
  const files = (await walk(path.resolve(bundleDir)))
    .filter((relative) => !MUTABLE_OUTPUTS.has(relative))
    .sort();
  const hashes = {};
  for (const relative of files) hashes[relative] = await sha256File(resolveInside(bundleDir, relative));
  return { algorithm: "sha256", files: hashes };
}

export async function verifyIntegrity(bundleDir, integrity) {
  if (integrity?.algorithm !== "sha256" || !integrity.manifestCoreSha256 || !integrity.files || Array.isArray(integrity.files)) {
    throw new BundleValidationError(REASON_CODES.CORRUPTED_BUNDLE, "manifest integrity index is missing or invalid");
  }
  const expectedPaths = Object.keys(integrity.files).map(normalizeBundlePath).sort();
  const actualPaths = (await walk(path.resolve(bundleDir)))
    .filter((relative) => !MUTABLE_OUTPUTS.has(relative))
    .sort();
  if (actualPaths.length > MAX_FILES) {
    throw new BundleValidationError(REASON_CODES.CORRUPTED_BUNDLE, `bundle exceeds ${MAX_FILES} files`);
  }
  if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) {
    throw new BundleValidationError(REASON_CODES.CORRUPTED_BUNDLE, "bundle file set differs from manifest", { expectedPaths, actualPaths });
  }
  let totalBytes = 0;
  for (const relative of expectedPaths) {
    const file = resolveInside(bundleDir, relative);
    const stat = await lstat(file);
    if (stat.size > MAX_FILE_BYTES) {
      throw new BundleValidationError(REASON_CODES.CORRUPTED_BUNDLE, `bundle file exceeds size limit: ${relative}`);
    }
    totalBytes += stat.size;
    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new BundleValidationError(REASON_CODES.CORRUPTED_BUNDLE, "bundle exceeds total size limit");
    }
    const actual = await sha256File(file);
    if (actual !== integrity.files[relative]) {
      throw new BundleValidationError(REASON_CODES.CORRUPTED_BUNDLE, `SHA-256 mismatch: ${relative}`, {
        expected: integrity.files[relative], actual,
      });
    }
  }
  return { valid: true, fileCount: expectedPaths.length, totalBytes };
}

export const integrityLimits = { MAX_FILES, MAX_FILE_BYTES, MAX_TOTAL_BYTES };
