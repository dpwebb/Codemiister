import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import type {
  AlphaBetaWorkflowLoop,
  AlphaReviewDecision,
  BetaResultReport,
  ValidationResultStatus,
  ValidationRun,
} from "../src/domain/workflow.ts";
import { runInMemoryAlphaBetaWorkflow } from "../src/workflow/runner.ts";

const args = process.argv.slice(2);
const outputPath = getOutputPath(args);
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
    "Local workflow transcript export using the deterministic in-memory workflow runner.",
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
const transcript = buildTranscript(workflow, !suppliedResult);

if (outputPath) {
  writeTranscriptFile(outputPath, transcript);
  console.log(`Workflow transcript written to ${outputPath}`);
} else {
  console.log(transcript);
}

function buildTranscript(
  workflowLoop: AlphaBetaWorkflowLoop,
  betaResultIsMock: boolean,
): string {
  const plan = workflowLoop.developmentPlan;
  const betaTask = workflowLoop.betaTask;
  const betaResult = workflowLoop.betaResult;
  const alphaReview = workflowLoop.alphaReview;

  if (!plan || !betaTask || !betaResult || !alphaReview) {
    console.error("Workflow did not return a complete Alpha/BETA transcript.");
    process.exit(1);
  }

  const lines: string[] = [];

  lines.push("# Automated Coder Workflow Transcript");
  lines.push("");
  addValue(lines, "Generated at", now);
  addValue(lines, "Admin idea", workflowLoop.ideaPrompt.goal);
  lines.push("");

  addSection(lines, "ALPHA Development Plan");
  addValue(lines, "Proposed application goal", plan.proposedApplicationGoal);
  addValue(lines, "Summary", plan.summary);
  addList(
    lines,
    "Material Admin questions",
    plan.questionsForAdmin?.map((item) => item.question) ?? [],
  );
  lines.push("");

  addSection(lines, "First BETA Task Prompt");
  addValue(lines, "Task title", betaTask.taskTitle);
  addValue(lines, "Exact goal", betaTask.exactGoal);
  addList(lines, "Allowed files/areas", betaTask.allowedFilesOrAreas);
  addList(lines, "Forbidden changes", betaTask.forbiddenChanges);
  addList(lines, "Implementation steps", betaTask.implementationSteps);
  addList(lines, "Acceptance checks", betaTask.acceptanceChecks);
  addList(lines, "Validation commands", betaTask.validationCommandSuggestions);
  lines.push("");

  addSection(
    lines,
    betaResultIsMock
      ? "BETA Result Report (MOCK / IN-MEMORY ONLY)"
      : "BETA Result Report",
  );
  addList(lines, "Files changed", betaResult.filesChanged);
  addValue(lines, "Behavior changed", betaResult.behaviorChanged);
  addList(
    lines,
    "Validation run",
    betaResult.validationRun.map((item) => `${item.command}: ${item.result}`),
  );
  addValue(lines, "Validation result", betaResult.validationResult);
  addList(lines, "Deviations from prompt", betaResult.deviationsFromPrompt);
  addList(lines, "Risks", betaResult.risks);
  addValue(lines, "Next-step recommendation", betaResult.nextStepRecommendation);
  lines.push("");

  addSection(lines, "ALPHA Review");
  addValue(lines, "Decision", alphaReview.decision);
  addValue(lines, "Drift risk", alphaReview.driftRisk.level);
  addList(lines, "Drift reasons", alphaReview.driftRisk.reasons);
  addList(lines, "Review findings", alphaReview.reviewFindings);
  addValue(lines, "Final workflow status", workflowLoop.status);
  addValue(lines, "Next recommended action", getNextAction(alphaReview.decision));

  return `${lines.join("\n")}\n`;
}

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
    console.error("Invalid BETA result JSON. The top-level value must be an object.");
    process.exit(1);
  }

  return {
    id: "transcript-beta-result-001",
    taskPromptId,
    submittedAt: now,
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
          typeof item.outputSummary === "string" ? item.outputSummary : undefined,
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

function getNextAction(decision: AlphaReviewDecision): string {
  if (decision === "continue") {
    return "Prepare the next small BETA task after ALPHA review.";
  }

  if (decision === "request_revision") {
    return "Request a bounded BETA revision before continuing.";
  }

  return "Halt and ask ADMIN for a scope or approval decision.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function printUsage(): void {
  console.error(
    "Usage: npm run workflow:transcript -- \"Create a simple project checklist app\" '{\"filesChanged\":[\"src/domain/example.ts\"],\"behaviorChanged\":[\"Added small domain helper\"],\"validationRun\":[\"npm run typecheck\"],\"validationResult\":\"passed\",\"deviationsFromPrompt\":[],\"risks\":[],\"nextStepRecommendation\":\"continue\"}' --out transcripts/checklist-app.md",
  );
}

function getOutputPath(inputArgs: string[]): string | undefined {
  const outIndex = inputArgs.indexOf("--out");
  if (outIndex !== -1) {
    const requestedPath = inputArgs[outIndex + 1]?.trim();
    if (!requestedPath) {
      console.error("Missing output path after --out.");
      process.exit(1);
    }

    assertSafeOutputPath(requestedPath);
    return requestedPath;
  }

  const lastArg = inputArgs.at(-1)?.trim();
  if (lastArg?.toLowerCase().endsWith(".md")) {
    assertSafeOutputPath(lastArg);
    return lastArg;
  }

  return undefined;
}

function assertSafeOutputPath(requestedPath: string): void {
  if (path.isAbsolute(requestedPath) || requestedPath.includes("..")) {
    console.error("--out must be a local relative path and must not contain '..'.");
    process.exit(1);
  }
}

function removeOutputArgs(inputArgs: string[]): string[] {
  const outIndex = inputArgs.indexOf("--out");
  if (outIndex !== -1) {
    return [
      ...inputArgs.slice(0, outIndex),
      ...inputArgs.slice(outIndex + 2),
    ];
  }

  const lastArg = inputArgs.at(-1)?.trim();
  if (lastArg?.toLowerCase().endsWith(".md")) {
    return inputArgs.slice(0, -1);
  }

  return inputArgs;
}

function writeTranscriptFile(requestedPath: string, transcript: string): void {
  const parentDirectory = path.dirname(requestedPath);

  if (parentDirectory && parentDirectory !== ".") {
    mkdirSync(parentDirectory, { recursive: true });
  }

  writeFileSync(requestedPath, transcript, "utf8");
}

function addSection(lines: string[], title: string): void {
  lines.push(`## ${title}`);
}

function addValue(lines: string[], label: string, value: string): void {
  lines.push(`${label}: ${value}`);
}

function addList(lines: string[], label: string, values: string[]): void {
  lines.push(`${label}:`);
  if (values.length === 0) {
    lines.push("- None");
    return;
  }

  for (const value of values) {
    lines.push(`- ${value}`);
  }
}

function createIdeaId(ideaTextValue: string): string {
  const slug = ideaTextValue
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return `admin-idea-${slug || "untitled"}`;
}
