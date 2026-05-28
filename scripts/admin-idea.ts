import { runInMemoryAlphaBetaWorkflow } from "../src/workflow/runner.ts";
import type { AlphaBetaWorkflowLoop } from "../src/domain/workflow.ts";

const ideaText = process.argv.slice(2).join(" ").trim();
const now = "2026-05-28T00:00:00.000Z";

if (!ideaText) {
  console.error('Usage: npm run admin:idea -- "Create a simple habit tracking app"');
  console.error("Runs one local in-memory Alpha/Beta workflow. No files are written.");
  process.exit(1);
}

const workflow = runInMemoryAlphaBetaWorkflow({
  ideaPrompt: {
    id: createIdeaId(ideaText),
    submittedAt: now,
    goal: ideaText,
  },
  existingProjectContextSummary:
    "Local Admin CLI intake using the deterministic in-memory workflow runner.",
  now,
});

printWorkflowSummary(workflow);

function printWorkflowSummary(workflowLoop: AlphaBetaWorkflowLoop): void {
  const plan = workflowLoop.developmentPlan;
  const betaTask = workflowLoop.betaTask;
  const alphaReview = workflowLoop.alphaReview;

  if (!plan || !betaTask || !alphaReview) {
    console.error("Workflow did not return the required Alpha/Beta loop parts.");
    process.exit(1);
  }

  console.log("Automated Coder Admin Idea Intake");
  console.log("");
  printValue("Admin idea", workflowLoop.ideaPrompt.goal);
  printValue("Alpha proposed application goal", plan.proposedApplicationGoal);
  printValue(
    "Alpha status",
    plan.approvalRequired ? "admin_approval_required" : "approved_for_beta",
  );
  printValue("Recommended first Beta task", betaTask.taskTitle);
  printList("Allowed areas", betaTask.allowedFilesOrAreas);
  printList("Forbidden changes", betaTask.forbiddenChanges);
  printList("Acceptance checks", betaTask.acceptanceChecks);
  printValue("Alpha review decision", alphaReview.decision);
  printValue("Final workflow status", workflowLoop.status);
}

function printValue(label: string, value: string): void {
  console.log(`${label}: ${value}`);
}

function printList(label: string, values: string[]): void {
  console.log(`${label}:`);
  for (const value of values) {
    console.log(`- ${value}`);
  }
}

function createIdeaId(ideaText: string): string {
  const slug = ideaText
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return `admin-idea-${slug || "untitled"}`;
}

