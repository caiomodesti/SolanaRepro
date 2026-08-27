import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluatePreflight,
  outputTail,
  parseArgs,
  platformInvocation,
  resolveExpectedCommit,
} from "../scripts/measure-clean-review.js";

const V0_1_COMMIT = "12dd8f85465097a4e1f0917d1de3e8d116afb1da";

test("clean-review arguments default to the published v0.1 release", () => {
  assert.deepEqual(parseArgs([]), {
    target: "v0.1.0",
    expectedCommit: V0_1_COMMIT,
    output: null,
    keepWorkspace: false,
    help: false,
  });
});

test("clean-review arguments accept a target pinned to a full commit and output", () => {
  assert.deepEqual(parseArgs(["--target", "release-candidate", "--expected-commit", V0_1_COMMIT, "--output", "result.json", "--keep-workspace"]), {
    target: "release-candidate",
    expectedCommit: V0_1_COMMIT,
    output: "result.json",
    keepWorkspace: true,
    help: false,
  });
});

test("clean-review rejects missing and unknown arguments", () => {
  assert.throws(() => parseArgs(["--target"]), /requires a value/);
  assert.throws(() => parseArgs(["--unsafe"]), /Unknown option/);
  assert.throws(() => parseArgs(["--target", "main"]), /--expected-commit is required/);
  assert.throws(() => parseArgs(["--expected-commit", "short-sha"]), /full 40-character Git SHA/);
});

test("known releases and full commit targets resolve to immutable expectations", () => {
  assert.equal(resolveExpectedCommit("v0.1.0"), V0_1_COMMIT);
  assert.equal(resolveExpectedCommit(V0_1_COMMIT.toUpperCase()), V0_1_COMMIT);
  assert.equal(resolveExpectedCommit("unknown"), null);
});

test("captured command output is bounded while preserving the failure tail", () => {
  assert.equal(outputTail("abcdef", 3), "[truncated to final 3 characters]\ndef");
  assert.equal(outputTail("abc", 3), "abc");
});

test("Windows invokes npm through Node instead of spawning a command shim", () => {
  assert.deepEqual(
    platformInvocation("npm", ["ci"], {
      platform: "win32",
      nodePath: "C:\\node\\node.exe",
      npmExecPath: "C:\\node\\npm-cli.js",
    }),
    { executable: "C:\\node\\node.exe", args: ["C:\\node\\npm-cli.js", "ci"] },
  );
  assert.deepEqual(platformInvocation("cargo", ["test"], { platform: "win32" }), {
    executable: "cargo",
    args: ["test"],
  });
  assert.deepEqual(platformInvocation("npm", ["ci"], { platform: "linux" }), {
    executable: "npm",
    args: ["ci"],
  });
});

test("preflight requires the pinned commit and a genuinely empty clean clone", () => {
  assert.deepEqual(
    evaluatePreflight({
      resolvedCommit: V0_1_COMMIT,
      expectedCommit: V0_1_COMMIT,
      statusExitCode: 0,
      statusOutput: "",
      nodeModulesAbsent: true,
      targetDirectoryAbsent: true,
    }),
    {
      ok: true,
      checks: {
        resolvedCommitMatches: true,
        gitStatusSucceeded: true,
        gitWorktreeClean: true,
        nodeModulesAbsent: true,
        targetDirectoryAbsent: true,
      },
      reasons: [],
    },
  );

  const rejected = evaluatePreflight({
    resolvedCommit: "0000000000000000000000000000000000000000",
    expectedCommit: V0_1_COMMIT,
    statusExitCode: 0,
    statusOutput: "?? target/",
    nodeModulesAbsent: false,
    targetDirectoryAbsent: false,
  });
  assert.equal(rejected.ok, false);
  assert.deepEqual(rejected.reasons, [
    "resolvedCommitMatches",
    "gitWorktreeClean",
    "nodeModulesAbsent",
    "targetDirectoryAbsent",
  ]);
});
