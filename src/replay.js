import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { writeJson } from "./io.js";
import { validateBundle } from "./bundle-validation.js";
import { runtimeCompatibility } from "./eligibility.js";

export async function replayBundle(bundleDirectory, { options = {} } = {}) {
  const bundleDir = path.resolve(bundleDirectory);
  const { manifest } = await validateBundle(bundleDir, { requireSupportedRuntime: false });
  const runtime = runtimeCompatibility(manifest);
  if (!runtime.compatible) {
    const result = { success: false, status: "UNSUPPORTED", reasons: runtime.reasons };
    await writeJson(path.resolve(options.out || path.join(bundleDir, "replay.json")), result);
    return result;
  }
  if (manifest.eligibility === "UNSUPPORTED") {
    const result = {
      success: false,
      status: "UNSUPPORTED",
      reason: "bundle is ineligible for evidence-grade replay",
      reasons: manifest.eligibilityReasons,
    };
    await writeJson(path.resolve(options.out || path.join(bundleDir, "replay.json")), result);
    return result;
  }
  const executable = process.platform === "win32"
    ? path.resolve("target/debug/repro-replay.exe")
    : path.resolve("target/debug/repro-replay");
  if (!existsSync(executable)) throw new Error(`replay backend is not built: ${executable}`);
  const output = path.resolve(options.out || path.join(bundleDir, "replay.json"));
  const child = spawnSync(executable, [bundleDir, output], {
    encoding: "utf8",
    windowsHide: true,
    timeout: Number(options.timeout || 120_000),
    maxBuffer: 10 * 1024 * 1024,
  });
  if (child.error) throw new Error(`replay backend could not start: ${child.error.message}`);
  if (child.status !== 0) throw new Error(`replay backend failed (${child.status}): ${child.stderr || child.stdout}`);
  return JSON.parse(child.stdout);
}
