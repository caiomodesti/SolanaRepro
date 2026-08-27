#!/usr/bin/env node

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const REPORT_SCHEMA = "solanarepro-clean-review/v1";
const DEFAULT_TARGET = "v0.1.0";
const MAX_CAPTURED_OUTPUT = 24_000;

function usage() {
  return `Usage: node scripts/measure-clean-review.js [options]

Runs the published review target in a new temporary clone and writes a
machine-readable timing/result report.

Options:
  --target <git-ref>       Release tag or commit to review (default: v0.1.0)
  --output <path>          Report path (default: review-results/<timestamp>.json)
  --keep-workspace         Preserve the temporary clone for investigation
  --help                   Show this help
`;
}

export function parseArgs(argv) {
  const options = { target: DEFAULT_TARGET, output: null, keepWorkspace: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--keep-workspace") options.keepWorkspace = true;
    else if (argument === "--target" || argument === "--output") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value`);
      options[argument.slice(2)] = value;
      index += 1;
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }
  return options;
}

export function outputTail(value, limit = MAX_CAPTURED_OUTPUT) {
  if (!value) return "";
  return value.length <= limit ? value : `[truncated to final ${limit} characters]\n${value.slice(-limit)}`;
}

export function platformInvocation(
  command,
  args,
  { platform = process.platform, nodePath = process.execPath, npmExecPath = process.env.npm_execpath } = {},
) {
  if (platform === "win32" && command === "npm") {
    const npmCli = npmExecPath || resolve(dirname(nodePath), "node_modules", "npm", "bin", "npm-cli.js");
    return { executable: nodePath, args: [npmCli, ...args] };
  }
  return { executable: command, args };
}

function commandResult(command, args, cwd, { stream = true } = {}) {
  const startedAt = Date.now();
  const invocation = platformInvocation(command, args);
  const child = spawnSync(invocation.executable, invocation.args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    env: process.env,
    maxBuffer: 16 * 1024 * 1024,
  });
  const stdout = child.stdout ?? "";
  const stderr = child.stderr ?? "";
  if (stream) {
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
  }
  return {
    command: [invocation.executable, ...invocation.args],
    durationMs: Date.now() - startedAt,
    exitCode: child.status,
    signal: child.signal,
    error: child.error?.message ?? null,
    stdoutTail: outputTail(stdout),
    stderrTail: outputTail(stderr),
  };
}

function version(command, args, cwd) {
  const result = commandResult(command, args, cwd, { stream: false });
  return result.exitCode === 0 ? result.stdoutTail.trim() : null;
}

function timestampForPath(date) {
  return date.toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

function failedStep(steps) {
  return steps.find((step) => step.exitCode !== 0) ?? null;
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n\n${usage()}`);
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    process.stdout.write(usage());
    return;
  }

  const scriptPath = fileURLToPath(import.meta.url);
  const repositoryRoot = resolve(dirname(scriptPath), "..");
  const startedAt = new Date();
  const defaultOutput = resolve(
    repositoryRoot,
    "review-results",
    `${options.target.replaceAll(/[^a-zA-Z0-9._-]/g, "_")}-${timestampForPath(startedAt)}.json`,
  );
  const outputPath = resolve(repositoryRoot, options.output ?? defaultOutput);
  const tempRoot = await mkdtemp(resolve(tmpdir(), "solanarepro-clean-review-"));
  const reviewRoot = resolve(tempRoot, "SolanaRepro");
  const steps = [];
  let report;

  process.stdout.write(`Review target: ${options.target}\nTemporary clone: ${reviewRoot}\n`);

  try {
    steps.push(commandResult("git", ["clone", "--no-local", "--branch", options.target, "--depth", "1", repositoryRoot, reviewRoot], repositoryRoot));
    if (!failedStep(steps)) {
      const statusBefore = commandResult("git", ["status", "--porcelain"], reviewRoot, { stream: false });
      const cleanAtStart = statusBefore.exitCode === 0 && statusBefore.stdoutTail === "";
      const nodeModulesAbsentAtStart = !existsSync(resolve(reviewRoot, "node_modules"));
      const targetDirectoryAbsentAtStart = !existsSync(resolve(reviewRoot, "target"));
      const installStartedAt = Date.now();

      steps.push(commandResult("npm", ["ci", "--ignore-scripts"], reviewRoot));
      if (!failedStep(steps)) {
        if (process.platform === "win32") {
          steps.push(commandResult("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts/build-replay.ps1"], reviewRoot));
          if (!failedStep(steps)) {
            steps.push(commandResult("cargo", ["+stable-x86_64-pc-windows-msvc", "test", "--locked", "--workspace"], reviewRoot));
          }
        } else {
          steps.push(commandResult("cargo", ["build", "--locked", "-p", "repro-replay"], reviewRoot));
          if (!failedStep(steps)) steps.push(commandResult("cargo", ["test", "--locked", "--workspace"], reviewRoot));
        }
      }

      let timeToFirstRegressionMs = null;
      if (!failedStep(steps)) {
        steps.push(commandResult("npm", ["run", "regression"], reviewRoot));
        timeToFirstRegressionMs = Date.now() - installStartedAt;
      }
      if (!failedStep(steps)) steps.push(commandResult("npm", ["test"], reviewRoot));

      const resolvedCommit = version("git", ["rev-parse", "HEAD"], reviewRoot);
      report = {
        schema: REPORT_SCHEMA,
        target: options.target,
        resolvedCommit,
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
        environment: {
          platform: process.platform,
          architecture: process.arch,
          node: process.version,
          npm: version("npm", ["--version"], reviewRoot),
          rustc: version("rustc", ["--version"], reviewRoot),
          cargo: version("cargo", ["--version"], reviewRoot),
        },
        cleanStart: {
          gitWorktreeClean: cleanAtStart,
          nodeModulesAbsent: nodeModulesAbsentAtStart,
          targetDirectoryAbsent: targetDirectoryAbsentAtStart,
        },
        timeToFirstRegressionMs,
        totalDurationMs: Date.now() - startedAt.getTime(),
        outcome: failedStep(steps) ? "FAIL" : "PASS",
        failedStep: failedStep(steps)?.command ?? null,
        steps,
      };
    } else {
      report = {
        schema: REPORT_SCHEMA,
        target: options.target,
        resolvedCommit: null,
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
        environment: { platform: process.platform, architecture: process.arch, node: process.version },
        cleanStart: null,
        timeToFirstRegressionMs: null,
        totalDurationMs: Date.now() - startedAt.getTime(),
        outcome: "FAIL",
        failedStep: failedStep(steps)?.command ?? null,
        steps,
      };
    }
  } finally {
    if (!report) {
      report = {
        schema: REPORT_SCHEMA,
        target: options.target,
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
        outcome: "ERROR",
        error: "The review harness terminated before producing a complete report.",
        steps,
      };
    }
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    process.stdout.write(`\nReview result: ${report.outcome}\nReport: ${outputPath}\n`);
    if (options.keepWorkspace) {
      process.stdout.write(`Temporary clone preserved: ${reviewRoot}\n`);
    } else if (basename(tempRoot).startsWith("solanarepro-clean-review-")) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  }

  if (report.outcome !== "PASS") process.exitCode = 1;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) await main();
