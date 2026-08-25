import { spawnSync } from "node:child_process";
import { replayBundle } from "../src/replay.js";

const supported = [
  ["System transfer", "examples/system-transfer/bundle"],
  ["Classic SPL transfer", "examples/spl-transfer/bundle"],
  ["Deterministic failure", "examples/deterministic-failure/bundle"],
];

for (const [label, bundle] of supported) {
  const result = spawnSync(process.execPath, ["src/cli.js", "assert", bundle, "--fresh", "--json"], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    process.stderr.write(`${label}: FAILED\n${result.stderr || result.stdout}`);
    process.exit(result.status ?? 1);
  }
  const assertion = JSON.parse(result.stdout);
  if (assertion.status !== "EXACT") throw new Error(`${label}: expected EXACT, got ${assertion.status}`);
  console.log(`✓ ${label}: EXACT`);
}

const unsupported = [
  ["ALT historical-state detection", "artifacts/5MEcdGqvxFnTY82f61nj1LHHycUpMvzWC5X9eSBYedbJpd7Qa7XncjvPZakBbSFE7LoV4rhU7HtJJB8K4V1WqrwJ/bundle"],
  ["CPI provenance detection", "artifacts/54b9hP8NQgRJmEss1SR4CnoNDJadymC7JavnKE773pF1WXGanrtpAX2grrd2tDPWEn9aDFiWcogYV9B46uHuVmpB/bundle"],
];

for (const [label, bundle] of unsupported) {
  const result = await replayBundle(bundle);
  if (result.status !== "UNSUPPORTED") throw new Error(`${label}: expected UNSUPPORTED`);
  console.log(`✓ ${label}: UNSUPPORTED`);
}
