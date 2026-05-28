import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { evaluateExecutionReadiness } from "../src/execution/readiness.ts";
import { runInMemoryAlphaBetaWorkflow } from "../src/workflow/runner.ts";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const outputPath = getRequiredOutputPath(args);
const ideaText = removeOutputArgs(args).join(" ").trim();
const now = "2026-05-28T00:00:00.000Z";

if (!ideaText) {
  printUsage();
  process.exit(1);
}

const workflow = runInMemoryAlphaBetaWorkflow({
  ideaPrompt: {
    id: createIdeaId(ideaText),
    submittedAt: now,
    goal: ideaText,
  },
  existingProjectContextSummary:
    "Local execution request package export using the deterministic in-memory workflow runner.",
  now,
});

if (!workflow.developmentPlan || !workflow.betaTask) {
  console.error("Workflow did not return the required ALPHA plan and BETA task.");
  process.exit(1);
}

const executionRequestPackage = {
  packageType: "codemiister.executionRequest",
  packageVersion: "1",
  generatedAt: now,
  adminIdea: workflow.ideaPrompt,
  alphaPlanSummary: {
    id: workflow.developmentPlan.id,
    summary: workflow.developmentPlan.summary,
    proposedApplicationGoal: workflow.developmentPlan.proposedApplicationGoal,
    approvalRequired: workflow.developmentPlan.approvalRequired,
    driftControlsForBeta: workflow.developmentPlan.driftControlsForBeta,
  },
  betaTask: workflow.betaTask,
  executionReadiness: evaluateExecutionReadiness(workflow.betaTask),
  validationSuggestions: workflow.betaTask.validationCommandSuggestions,
  requiredResultReportFormat: workflow.betaTask.expectedResultReportFormat,
  noExecutionStatement:
    "No execution occurred. This package is for manual review/export only.",
};

writeJsonFile(outputPath, executionRequestPackage);
console.log(`Execution request package written to ${outputPath}`);

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

function removeOutputArgs(inputArgs: string[]): string[] {
  const outIndex = inputArgs.indexOf("--out");
  return [
    ...inputArgs.slice(0, outIndex),
    ...inputArgs.slice(outIndex + 2),
  ];
}

function assertSafeOutputPath(requestedPath: string): void {
  if (path.isAbsolute(requestedPath) || requestedPath.includes("..")) {
    console.error(
      "--out must be a local relative path and must not contain '..'.",
    );
    process.exit(1);
  }
}

function writeJsonFile(requestedPath: string, content: unknown): void {
  const parentDirectory = path.dirname(requestedPath);

  if (parentDirectory && parentDirectory !== ".") {
    mkdirSync(parentDirectory, { recursive: true });
  }

  writeFileSync(requestedPath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
}

function createIdeaId(ideaTextValue: string): string {
  const slug = ideaTextValue
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return `admin-idea-${slug || "untitled"}`;
}

function printUsage(): void {
  console.error(
    'Usage: npm run execution:request -- -- "Create a simple project checklist app" --out transcripts/execution-request.json',
  );
}
