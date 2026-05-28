import type { BetaResultReport } from "../domain/workflow.ts";
import type { ExecutionStatus } from "./adapter.ts";

export const EXECUTION_RESULT_PACKAGE_TYPE = "codemiister.executionResult";
export const EXECUTION_RESULT_PACKAGE_VERSION = "1";

export interface ExecutionResultPackage {
  packageType: typeof EXECUTION_RESULT_PACKAGE_TYPE;
  packageVersion: typeof EXECUTION_RESULT_PACKAGE_VERSION;
  completedAt: string;
  requestPackageType?: string;
  requestPackageVersion?: string;
  taskTitle: string;
  betaResultReport: BetaResultReport;
  executionStatus: ExecutionStatus;
  noExternalValidationClaim: string;
}

export interface ExecutionResultPackageValidation {
  valid: boolean;
  errors: string[];
  summary: {
    packageType: string;
    taskTitle: string;
    executionStatus: string;
    validationResult: string;
    filesChangedCount: number;
    riskCount: number;
  };
}

export function validateExecutionResultPackage(
  value: unknown,
): ExecutionResultPackageValidation {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return {
      valid: false,
      errors: ["Execution result package must be an object."],
      summary: createEmptySummary(),
    };
  }

  const packageType = getRequiredString(value, "packageType", errors);
  if (packageType && packageType !== EXECUTION_RESULT_PACKAGE_TYPE) {
    errors.push(`packageType must be ${EXECUTION_RESULT_PACKAGE_TYPE}.`);
  }

  getRequiredString(value, "packageVersion", errors);
  const completedAt =
    getStringField(value, "completedAt") || getStringField(value, "generatedAt");
  if (!completedAt) {
    errors.push("completedAt or generatedAt is required.");
  }

  const taskTitle = getRequiredString(value, "taskTitle", errors);
  const executionStatus = getRequiredString(value, "executionStatus", errors);
  getRequiredString(value, "noExternalValidationClaim", errors);

  const betaResultReport = getRequiredRecord(
    value,
    "betaResultReport",
    errors,
  );

  const validationResult = betaResultReport
    ? getRequiredString(betaResultReport, "validationResult", errors)
    : "";
  const filesChanged = betaResultReport
    ? getRequiredArray(betaResultReport, "filesChanged", errors)
    : [];
  const risks = betaResultReport
    ? getRequiredArray(betaResultReport, "risks", errors)
    : [];

  if (betaResultReport) {
    getRequiredString(betaResultReport, "behaviorChanged", errors);
    getRequiredArray(betaResultReport, "validationRun", errors);
    getRequiredArray(betaResultReport, "deviationsFromPrompt", errors);
    getRequiredString(betaResultReport, "nextStepRecommendation", errors);
  }

  return {
    valid: errors.length === 0,
    errors,
    summary: {
      packageType: packageType || "unknown",
      taskTitle: taskTitle || "unknown",
      executionStatus: executionStatus || "unknown",
      validationResult: validationResult || "unknown",
      filesChangedCount: filesChanged.length,
      riskCount: risks.length,
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
): string {
  const value = getStringField(parent, key);

  if (!value) {
    errors.push(`${key} is required.`);
  }

  return value;
}

function getRequiredArray(
  parent: Record<string, unknown>,
  key: string,
  errors: string[],
  requireNonEmpty = false,
): unknown[] {
  const value = parent[key];

  if (!Array.isArray(value)) {
    errors.push(`betaResultReport.${key} is required and must be an array.`);
    return [];
  }

  if (requireNonEmpty && value.length === 0) {
    errors.push(`betaResultReport.${key} must not be empty.`);
  }

  return value;
}

function getStringField(parent: Record<string, unknown>, key: string): string {
  const value = parent[key];
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createEmptySummary(): ExecutionResultPackageValidation["summary"] {
  return {
    packageType: "unknown",
    taskTitle: "unknown",
    executionStatus: "unknown",
    validationResult: "unknown",
    filesChangedCount: 0,
    riskCount: 0,
  };
}
