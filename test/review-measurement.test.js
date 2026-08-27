import assert from "node:assert/strict";
import test from "node:test";

import { outputTail, parseArgs, platformInvocation } from "../scripts/measure-clean-review.js";

test("clean-review arguments default to the published v0.1 release", () => {
  assert.deepEqual(parseArgs([]), {
    target: "v0.1.0",
    output: null,
    keepWorkspace: false,
    help: false,
  });
});

test("clean-review arguments accept an immutable target and output", () => {
  assert.deepEqual(parseArgs(["--target", "ffbd0b3", "--output", "result.json", "--keep-workspace"]), {
    target: "ffbd0b3",
    output: "result.json",
    keepWorkspace: true,
    help: false,
  });
});

test("clean-review rejects missing and unknown arguments", () => {
  assert.throws(() => parseArgs(["--target"]), /requires a value/);
  assert.throws(() => parseArgs(["--unsafe"]), /Unknown option/);
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
