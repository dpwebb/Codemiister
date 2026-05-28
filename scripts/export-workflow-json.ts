import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import type {
  AlphaReviewDecision,
  BetaResultReport,
  ValidationResultStatus,
  ValidationRun,
} from "../src/domain/workflow.ts";
import { runInMemoryAlphaBetaWorkflow } from "../src/workflow/runner.ts";

const args = process.argv.slice(2);
const outputPath = getRequiredOutputPath(args);
const contentArgs = removeOutputArgs(args);
const ideaText = contentArgs[0]?.trim();
const reportJson = contentArgs.slice(1).join(" ").trim();
const now = "2026-05-28T00:00:00.000Z";

if (!ideaText) {
  printUsage();
  process.exit(1);
}

const baseInput = {
  ideaPrompt: {
    id: createIdeaId(ideaText),
    submittedAt: now,
    goal: ideaText,
  },
  existingProjectContextSummary:
    "Local workflow JSON export using the deterministic in-memory workflow runner.",
  now,
};
const baseWorkflow = runInMemoryAlphaBetaWorkflow(baseInput);

if (!baseWorkflow.betaTask) {
  console.error("Workflow did not return a BETA task prompt.");
  process.exit(1);
}

const suppliedResult = reportJson
  ? parseBetaResultReport(reportJson, baseWorkflow.betaTask.id)
  : undefined;
const workflow = suppliedResult
  ? runInMemoryAlphaBetaWorkflow({
      ...baseInput,
      betaResultReport: suppliedResult,
    })
  : baseWorkflow;

writeWorkflowJsonFile(outputPath, workflow);
console.log(`Workflow JSON written to ${outputPath}`);

function parseBetaResultReport(
  reportJsonText: string,
  taskPromptId: string,
): BetaResultReport {
  let parsed: unknown;

  try {
    parsed = JSON.parse(reportJsonText);
  } catch {
    console.error("Invalid BETA result JSON. Provide one valid JSON object.");
    process.exit(1);
  }

  if (!isRecord(parsed)) {
    console.error(
      "Invalid BETA result JSON. The top-level value must be an object.",
    );
    process.exit(1);
  }

  return {
    id: typeof parsed.id === "string" ? parsed.id : "manual-beta-result-001",
    taskPromptId,
    submittedAt:
      typeof parsed.submittedAt === "string" ? parsed.submittedAt : now,
    filesChanged: toStringArray(parsed.filesChanged),
    behaviorChanged: toText(parsed.behaviorChanged),
    validationRun: toValidationRunArray(parsed.validationRun),
    validationResult: toValidationResult(parsed.validationResult),
    deviationsFromPrompt: toStringArray(parsed.deviationsFromPrompt),
    risks: toStringArray(parsed.risks),
    nextStepRecommendation: toReviewDecision(parsed.nextStepRecommendation),
  };
}

function toValidationRunArray(value: unknown): ValidationRun[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    if (typeof item === "string") {
      return {
        command: item,
        result: "passed",
      };
    }

    if (isRecord(item)) {
      return {
        command: toText(item.command),
        result: toValidationResult(item.result),
        outputSummary:
          typeof item.outputSummary === "string"
            ? item.outputSummary
            : undefined,
      };
    }

    return {
      command: String(item),
      result: "not_run",
    };
  });
}

function toValidationResult(value: unknown): ValidationResultStatus {
  return value === "failed" || value === "not_run" || value === "passed"
    ? value
    : "not_run";
}

function toReviewDecision(value: unknown): AlphaReviewDecision {
  if (value === "halt" || value === "halt_for_admin") {
    return "halt_for_admin";
  }

  if (value === "request_revision") {
    return "request_revision";
  }

  return "continue";
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item));
}

function toText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join("; ");
  }

  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRequiredOutputPath(inputArgs: string[]): string {
  const outIndex = inputArgs.indexOf("--out");
  if (outIndex === -1) {
    printUsage();
    process.exit(1);
  }

  const requestedPath = inputArgs[outIndex + 1]?.trim();
  if (!requestedPath) {
    console.error("Missing output path after --out.");
    process.exit(1);
  }

  assertSafeOutputPath(requestedPath);
  return requestedPath;
}

function assertSafeOutputPath(requestedPath: string): void {
  if (path.isAbsolute(requestedPath) || requestedPath.includes("..")) {
    console.error(
      "--out must be a local relative path and must not contain '..'.",
    );
    process.exit(1);
  }
}

function removeOutputArgs(inputArgs: string[]): string[] {
  const outIndex = inputArgs.indexOf("--out");
  return [
    ...inputArgs.slice(0, outIndex),
    ...inputArgs.slice(outIndex + 2),
  ];
}

function writeWorkflowJsonFile(requestedPath: string, workflow: unknown): void {
  const parentDirectory = path.dirname(requestedPath);

  if (parentDirectory && parentDirectory !== ".") {
    mkdirSync(parentDirectory, { recursive: true });
  }

  writeFileSync(requestedPath, `${JSON.stringify(workflow, null, 2)}\n`, "utf8");
}

function printUsage(): void {
  console.error(
    "Usage: npm run workflow:json -- \"Create a simple project checklist app\" --out transcripts/checklist-app.json",
  );
}

function createIdeaId(ideaTextValue: string): string {
  const slug = ideaTextValue
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return `admin-idea-${slug || "untitled"}`;
}
