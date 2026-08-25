import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function writeJson(file, value) {
  await ensureDir(path.dirname(file));
  await writeFile(file, `${JSON.stringify(value, bigintReplacer, 2)}\n`, "utf8");
}

export async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

export async function readJsonLimited(file, maxBytes = 10 * 1024 * 1024) {
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`unsafe JSON input: ${file}`);
  if (stat.size > maxBytes) throw new Error(`JSON input exceeds ${maxBytes} bytes: ${file}`);
  return readJson(file);
}

export async function writeText(file, value) {
  await ensureDir(path.dirname(file));
  await writeFile(file, value, "utf8");
}

export function bigintReplacer(_key, value) {
  return typeof value === "bigint" ? value.toString() : value;
}

export function resolveArtifactDir(signature, root = process.cwd()) {
  return path.join(root, "artifacts", signature);
}
