import path from "node:path";
import { existsSync } from "node:fs";
import { compareReplay } from "./compare.js";
import { replayBundle } from "./replay.js";
import { validateBundle } from "./bundle-validation.js";
import { readJson } from "./io.js";
import { canonicalError } from "./compare.js";

export async function assertBundle(bundleDirectory, { options = {} } = {}) {
  const bundleDir = path.resolve(bundleDirectory);
  const validated = await validateBundle(bundleDir);
  let replayFile = options.replay ? path.resolve(options.replay) : path.join(bundleDir, "replay.json");
  if (!existsSync(replayFile) || options.fresh) {
    await replayBundle(bundleDir, { options });
    replayFile = path.join(bundleDir, "replay.json");
  }
  const comparison = await compareReplay(bundleDir, replayFile, { options: { out: path.join(bundleDir, "comparison.json") } });
  const accepted = new Set((options.accept || "EXACT,HIGH_FIDELITY").split(","));
  if (!accepted.has(comparison.status)) {
    throw new Error(`regression assertion failed: ${comparison.status}; accepted: ${[...accepted].join(", ")}`);
  }
  const replay = await readJson(replayFile);
  const expectedError = canonicalError(validated.expected.error);
  const actualError = canonicalError(replay.error);
  return {
    passed: true,
    status: comparison.status,
    expected: validated.expected.success ? "SUCCESS" : `FAIL ${expectedError}`,
    actual: replay.success ? "SUCCESS" : `FAIL ${actualError}`,
    comparisonFile: path.join(bundleDir, "comparison.json"),
  };
}
