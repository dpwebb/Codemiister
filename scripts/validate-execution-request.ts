import { readFileSync } from "node:fs";
import path from "node:path";

const requestedPath = process.argv[2]?.trim();

if (!requestedPath) {
  printUsage();
  process.exit(1);
}

assertSafeInputPath(requestedPath);

const requestPackage = readJson(requestedPath);
const validation = validateExecutionRequestPackage(requestPackage);

if (validation.errors.length > 0) {
  console.error("Execution request package is invalid:");
  for (const error of validation.errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Execution request package is valid.");
console.log(`Package type: ${validation.summary.packageType}`);
console.log(`Task title: ${validation.summary.taskTitle}`);
console.log(
  `Readiness: ${validation.summary.ready ? "ready" : "blocked"}`,
);
console.log(`Blocker count: ${validation.summary.blockerCount}`);
console.log(`Warning count: ${validation.summary.warningCount}`);

interface ExecutionRequestValidationSummary {
  packageType: string;
  taskTitle: string;
  ready: boolean;
  blockerCount: number;
  warningCount: number;
}

interface ExecutionRequestValidationResult {
  errors: string[];
  summary: ExecutionRequestValidationSummary;
}

function readJson(inputPath: string): unknown {
  let fileContent: string;

  try {
    fileContent = readFileSync(inputPath, "utf8");
  } catch (error) {
    console.error(`Unable to read execution request package: ${formatError(error)}`);
    process.exit(1);
  }

  try {
    return JSON.parse(fileContent.replace(/^\uFEFF/, ""));
  } catch (error) {
    console.error(`Invalid JSON: ${formatError(error)}`);
    process.exit(1);
  }
}

function validateExecutionRequestPackage(
  value: unknown,
): ExecutionRequestValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return {
      errors: ["Execution request package must be an object."],
      summary: createEmptySummary(),
    };
  }

  const packageType = getRequiredString(value, "packageType", errors);
  if (packageType && packageType !== "codemiister.executionRequest") {
    errors.push("packageType must be codemiister.executionRequest.");
  }

  getRequiredString(value, "packageVersion", errors);
  getRequiredString(value, "generatedAt", errors);
  getRequiredRecord(value, "adminIdea", errors);
  getRequiredRecord(value, "alphaPlanSummary", errors);
  const betaTask = getRequiredRecord(value, "betaTask", errors);
  const readiness = getRequiredRecord(value, "executionReadiness", errors);
  getRequiredArray(value, "validationSuggestions", errors, "", true);
  getRequiredArray(value, "requiredResultReportFormat", errors, "", true);
  getRequiredString(value, "noExecutionStatement", errors);

  const taskTitle = betaTask
    ? getStringField(betaTask, "taskTitle") || getStringField(betaTask, "title")
    : "";
  if (!taskTitle) {
    errors.push("betaTask.taskTitle is required.");
  }

  if (betaTask) {
    getRequiredString(betaTask, "exactGoal", errors, "betaTask.exactGoal");
    getFirstRequiredArray(
      betaTask,
      ["allowedFilesOrAreas", "allowedAreas"],
      errors,
      "betaTask.allowedFilesOrAreas",
    );
    getRequiredArray(betaTask, "forbiddenChanges", errors, "betaTask", true);
    getRequiredArray(betaTask, "acceptanceChecks", errors, "betaTask", true);
  }

  const ready = readiness ? getRequiredBoolean(readiness, "ready", errors) : false;
  const blockerCount = readiness
    ? getRequiredArray(readiness, "blockers", errors, "executionReadiness")
        .length
    : 0;
  const warningCount = readiness
    ? getRequiredArray(readiness, "warnings", errors, "executionReadiness")
        .length
    : 0;

  if (readiness) {
    getRequiredArray(
      readiness,
      "normalizedAllowedAreas",
      errors,
      "executionReadiness",
      true,
    );
    getRequiredArray(
      readiness,
      "normalizedForbiddenChanges",
      errors,
      "executionReadiness",
      true,
    );
  }

  return {
    errors,
    summary: {
      packageType: packageType || "unknown",
      taskTitle: taskTitle || "unknown",
      ready,
      blockerCount,
      warningCount,
    },
  };
}

function getRequiredRecord(
  parent: Record<string, unknown>,
  key: string,
  errors: string[],
): Record<string, unknown> | null {
  const value = parent[key];

  if (!isRecord(value)) {
    errors.push(`${key} is required and must be an object.`);
    return null;
  }

  return value;
}

function getRequiredString(
  parent: Record<string, unknown>,
  key: string,
  errors: string[],
  label = key,
): string {
  const value = getStringField(parent, key);

  if (!value) {
    errors.push(`${label} is required.`);
  }

  return value;
}

function getRequiredBoolean(
  parent: Record<string, unknown>,
  key: string,
  errors: string[],
): boolean {
  const value = parent[key];

  if (typeof value !== "boolean") {
    errors.push(`executionReadiness.${key} is required and must be boolean.`);
    return false;
  }

  return value;
}

function getRequiredArray(
  parent: Record<string, unknown>,
  key: string,
  errors: string[],
  prefix = "",
  requireNonEmpty = false,
): unknown[] {
  const value = parent[key];
  const label = prefix ? `${prefix}.${key}` : key;

  if (!Array.isArray(value)) {
    errors.push(`${label} is required and must be an array.`);
    return [];
  }

  if (requireNonEmpty && value.length === 0) {
    errors.push(`${label} must not be empty.`);
  }

  return value;
}

function getFirstRequiredArray(
  parent: Record<string, unknown>,
  keys: string[],
  errors: string[],
  label: string,
): unknown[] {
  for (const key of keys) {
    const value = parent[key];
    if (Array.isArray(value)) {
      if (value.length === 0) {
        errors.push(`${label} must not be empty.`);
      }

      return value;
    }
  }

  errors.push(
    `${label} or betaTask.allowedAreas is required and must be an array.`,
  );
  return [];
}

function getStringField(parent: Record<string, unknown>, key: string): string {
  const value = parent[key];
  return typeof value === "string" ? value.trim() : "";
}

function assertSafeInputPath(inputPath: string): void {
  if (path.isAbsolute(inputPath) || inputPath.includes("..")) {
    console.error(
      "Execution request path must be a local relative path and must not contain '..'.",
    );
    process.exit(1);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createEmptySummary(): ExecutionRequestValidationSummary {
  return {
    packageType: "unknown",
    taskTitle: "unknown",
    ready: false,
    blockerCount: 0,
    warningCount: 0,
  };
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function printUsage(): void {
  console.error(
    "Usage: npm run execution:validate -- transcripts/execution-request.json",
  );
}
