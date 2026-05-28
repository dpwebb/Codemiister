import { readFileSync } from "node:fs";
import path from "node:path";

import { validateExecutionResultPackage } from "../src/execution/result-package.ts";

const requestedPath = process.argv[2]?.trim();

if (!requestedPath) {
  printUsage();
  process.exit(1);
}

assertSafeInputPath(requestedPath);

const resultPackage = readJson(requestedPath);
const validation = validateExecutionResultPackage(resultPackage);

if (!validation.valid) {
  console.error("Execution result package is invalid:");
  for (const error of validation.errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Execution result package is valid.");
console.log(`Package type: ${validation.summary.packageType}`);
console.log(`Task title: ${validation.summary.taskTitle}`);
console.log(`Execution status: ${validation.summary.executionStatus}`);
console.log(`Validation result: ${validation.summary.validationResult}`);
console.log(`Files changed count: ${validation.summary.filesChangedCount}`);
console.log(`Risk count: ${validation.summary.riskCount}`);

function readJson(inputPath: string): unknown {
  let fileContent: string;

  try {
    fileContent = readFileSync(inputPath, "utf8");
  } catch (error) {
    console.error(`Unable to read execution result package: ${formatError(error)}`);
    process.exit(1);
  }

  try {
    return JSON.parse(fileContent.replace(/^\uFEFF/, ""));
  } catch (error) {
    console.error(`Invalid JSON: ${formatError(error)}`);
    process.exit(1);
  }
}

function assertSafeInputPath(inputPath: string): void {
  if (path.isAbsolute(inputPath) || inputPath.includes("..")) {
    console.error(
      "Execution result path must be a local relative path and must not contain '..'.",
    );
    process.exit(1);
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function printUsage(): void {
  console.error(
    "Usage: npm run execution:result:validate -- transcripts/execution-result.json",
  );
}
