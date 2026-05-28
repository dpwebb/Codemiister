import { createManualExecutionAdapter } from "../src/execution/adapter.ts";
import {
  evaluateExecutionReadiness,
  type ExecutionReadinessReport,
} from "../src/execution/readiness.ts";
import { runInMemoryAlphaBetaWorkflow } from "../src/workflow/runner.ts";
import type {
  BetaTaskPrompt,
  AlphaBetaWorkflowLoop,
} from "../src/domain/workflow.ts";

const ideaText = process.argv.slice(2).join(" ").trim();
const now = "2026-05-28T00:00:00.000Z";

if (!ideaText) {
  console.error(
    'Usage: npm run beta:execute:manual -- "Create a simple project checklist app"',
  );
  console.error(
    "Prepares a manual BETA execution preview. It does not execute Codex.",
  );
  process.exit(1);
}

const workflow = runInMemoryAlphaBetaWorkflow({
  ideaPrompt: {
    id: createIdeaId(ideaText),
    submittedAt: now,
    goal: ideaText,
  },
  existingProjectContextSummary:
    "Local manual execution preview using the deterministic in-memory workflow runner.",
  now,
});

if (!workflow.betaTask) {
  console.error("Workflow did not return a BETA task prompt.");
  process.exit(1);
}

const executionAdapter = createManualExecutionAdapter();
const readiness = evaluateExecutionReadiness(workflow.betaTask);
const executionResult = await executionAdapter.execute({
  id: `manual-execution-${workflow.betaTask.id}`,
  requestedAt: now,
  mode: "manual",
  taskPrompt: workflow.betaTask,
  allowedFilesOrAreas: workflow.betaTask.allowedFilesOrAreas,
  forbiddenChanges: workflow.betaTask.forbiddenChanges,
  validationCommandSuggestions: workflow.betaTask.validationCommandSuggestions,
  stopConditions: workflow.betaTask.stopConditions,
});

printManualExecutionPreview(workflow, workflow.betaTask, readiness);

function printManualExecutionPreview(
  workflowLoop: AlphaBetaWorkflowLoop,
  betaTask: BetaTaskPrompt,
  readinessReport: ExecutionReadinessReport,
): void {
  console.log("Automated Coder Manual BETA Execution Preview");
  console.log("");
  printValue("Admin idea", workflowLoop.ideaPrompt.goal);
  printValue("Readiness", readinessReport.ready ? "ready" : "blocked");
  printList("Readiness blockers", readinessReport.blockers);
  printList("Readiness warnings", readinessReport.warnings);
  printList("Normalized allowed areas", readinessReport.normalizedAllowedAreas);
  printList(
    "Normalized forbidden changes",
    readinessReport.normalizedForbiddenChanges,
  );
  printValue("Adapter", executionAdapter.name);
  printValue("Execution status", executionResult.status);
  printValue("BETA task title", betaTask.taskTitle);
  printValue("Exact goal", betaTask.exactGoal);
  printList("Allowed areas", betaTask.allowedFilesOrAreas);
  printList("Forbidden changes", betaTask.forbiddenChanges);
  printList("Validation suggestions", betaTask.validationCommandSuggestions);
  console.log("No execution occurred.");
  console.log(
    "Next instruction: ADMIN should copy/paste the BETA task to Codex manually, then require a BETA Result Report before ALPHA review.",
  );
}

function printValue(label: string, value: string): void {
  console.log(`${label}: ${value}`);
}

function printList(label: string, values: string[]): void {
  console.log(`${label}:`);
  if (values.length === 0) {
    console.log("- None");
    return;
  }

  for (const value of values) {
    console.log(`- ${value}`);
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
