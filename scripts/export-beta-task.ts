import { runInMemoryAlphaBetaWorkflow } from "../src/workflow/runner.ts";
import type { BetaTaskPrompt } from "../src/domain/workflow.ts";

const ideaText = process.argv.slice(2).join(" ").trim();
const now = "2026-05-28T00:00:00.000Z";

if (!ideaText) {
  console.error('Usage: npm run beta:task -- "Create a simple project checklist app"');
  console.error("Prints one copy/paste-ready BETA task prompt. It does not execute Codex.");
  process.exit(1);
}

const workflow = runInMemoryAlphaBetaWorkflow({
  ideaPrompt: {
    id: createIdeaId(ideaText),
    submittedAt: now,
    goal: ideaText,
  },
  existingProjectContextSummary:
    "Local BETA task export using the deterministic in-memory workflow runner.",
  now,
});

if (!workflow.betaTask) {
  console.error("Workflow did not return a BETA task prompt.");
  process.exit(1);
}

printBetaTaskPrompt(workflow.betaTask);

function printBetaTaskPrompt(betaTask: BetaTaskPrompt): void {
  console.log("# BETA Task Prompt");
  console.log("");
  printSection("Task Title", betaTask.taskTitle);
  printSection("Exact Goal", betaTask.exactGoal);
  printListSection("Allowed Files/Areas", betaTask.allowedFilesOrAreas);
  printListSection("Forbidden Changes", betaTask.forbiddenChanges);
  printListSection("Implementation Steps", betaTask.implementationSteps);
  printListSection("Acceptance Checks", betaTask.acceptanceChecks);
  printListSection("Validation Commands", betaTask.validationCommandSuggestions);
  printListSection(
    "Required Result Report Format",
    betaTask.expectedResultReportFormat,
  );
  printSection(
    "Do Not Overcode",
    "Implement only the exact goal above. Do not broaden scope, add unrelated features, or continue past the requested task.",
  );
}

function printSection(title: string, body: string): void {
  console.log(`## ${title}`);
  console.log(body);
  console.log("");
}

function printListSection(title: string, values: string[]): void {
  console.log(`## ${title}`);
  for (const value of values) {
    console.log(`- ${value}`);
  }
  console.log("");
}

function createIdeaId(ideaText: string): string {
  const slug = ideaText
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return `admin-idea-${slug || "untitled"}`;
}

