import { readFileSync } from "node:fs";
import path from "node:path";

const requestedPath = process.argv[2]?.trim();

if (!requestedPath) {
  printUsage();
  process.exit(1);
}

assertSafeInputPath(requestedPath);

const workflowJson = readWorkflowJson(requestedPath);
const validation = validateWorkflowObject(workflowJson);

if (validation.errors.length > 0) {
  console.error("Workflow JSON is invalid:");
  for (const error of validation.errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Workflow JSON is valid.");
console.log(`Path: ${requestedPath}`);
console.log(`Status: ${validation.summary.status}`);
console.log(`Development plan: ${validation.summary.developmentPlanId}`);
console.log(`BETA task: ${validation.summary.betaTaskTitle}`);
console.log(`ALPHA review decision: ${validation.summary.alphaReviewDecision}`);

interface WorkflowValidationSummary {
  status: string;
  developmentPlanId: string;
  betaTaskTitle: string;
  alphaReviewDecision: string;
}

interface WorkflowValidationResult {
  errors: string[];
  summary: WorkflowValidationSummary;
}

function readWorkflowJson(inputPath: string): unknown {
  let fileContent: string;

  try {
    fileContent = readFileSync(inputPath, "utf8");
  } catch (error) {
    console.error(`Unable to read workflow JSON file: ${formatError(error)}`);
    process.exit(1);
  }

  try {
    return JSON.parse(fileContent.replace(/^\uFEFF/, ""));
  } catch (error) {
    console.error(`Invalid JSON: ${formatError(error)}`);
    process.exit(1);
  }
}

function validateWorkflowObject(workflow: unknown): WorkflowValidationResult {
  const errors: string[] = [];

  if (!isRecord(workflow)) {
    return {
      errors: ["Workflow JSON must be an object."],
      summary: createEmptySummary(),
    };
  }

  const developmentPlan = getRequiredRecord(
    workflow,
    "developmentPlan",
    errors,
  );
  const betaTask = getRequiredRecord(workflow, "betaTask", errors);
  getRequiredRecord(workflow, "betaResult", errors);
  const alphaReview = getRequiredRecord(workflow, "alphaReview", errors);
  const status = getRequiredString(workflow, "status", errors);

  const developmentPlanId = developmentPlan
    ? getStringField(developmentPlan, "id")
    : "";
  if (!developmentPlanId) {
    errors.push("developmentPlan.id is required.");
  }

  const betaTaskTitle = betaTask
    ? getStringField(betaTask, "taskTitle") || getStringField(betaTask, "title")
    : "";
  if (!betaTaskTitle) {
    errors.push("betaTask.taskTitle is required.");
  }

  const betaTaskExactGoal = betaTask ? getStringField(betaTask, "exactGoal") : "";
  if (!betaTaskExactGoal) {
    errors.push("betaTask.exactGoal is required.");
  }

  const alphaReviewDecision = alphaReview
    ? getStringField(alphaReview, "decision")
    : "";
  if (!alphaReviewDecision) {
    errors.push("alphaReview.decision is required.");
  }

  return {
    errors,
    summary: {
      status: status || "unknown",
      developmentPlanId: developmentPlanId || "unknown",
      betaTaskTitle: betaTaskTitle || "unknown",
      alphaReviewDecision: alphaReviewDecision || "unknown",
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

function getStringField(parent: Record<string, unknown>, key: string): string {
  const value = parent[key];
  return typeof value === "string" ? value.trim() : "";
}

function assertSafeInputPath(inputPath: string): void {
  if (path.isAbsolute(inputPath) || inputPath.includes("..")) {
    console.error(
      "Workflow path must be a local relative path and must not contain '..'.",
    );
    process.exit(1);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createEmptySummary(): WorkflowValidationSummary {
  return {
    status: "unknown",
    developmentPlanId: "unknown",
    betaTaskTitle: "unknown",
    alphaReviewDecision: "unknown",
  };
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function printUsage(): void {
  console.error("Usage: npm run workflow:validate -- transcripts/checklist-app.json");
}
