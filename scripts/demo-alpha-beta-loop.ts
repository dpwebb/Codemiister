import { createAlphaDevelopmentPlan } from "../src/alpha/planner.ts";
import { reviewBetaResult } from "../src/alpha/review.ts";
import type { BetaResultReport } from "../src/domain/workflow.ts";

const args = process.argv.slice(2);
const driftMode = args.includes("--drift");
const ideaText =
  args.find((arg) => !arg.startsWith("--")) ??
  "Create a lightweight planning assistant for small software projects.";
const now = "2026-05-28T00:00:00.000Z";

const alphaPlan = createAlphaDevelopmentPlan({
  ideaPrompt: {
    id: "demo-idea-001",
    submittedAt: now,
    goal: ideaText,
    targetUsers: ["ADMIN", "ALPHA", "BETA"],
  },
  existingProjectContextSummary:
    "Repository contains doctrine documents and minimal Alpha/Beta workflow contracts.",
  now,
});

const betaResultReport: BetaResultReport = driftMode
  ? {
      id: "demo-beta-result-001",
      taskPromptId: alphaPlan.recommendedFirstBetaTask.id,
      submittedAt: now,
      filesChanged: ["package.json", "src/domain/workflow.ts"],
      behaviorChanged:
        "Added a package file outside the allowed task scope and reported a forbidden change.",
      validationRun: [
        {
          command: "npm run demo -- --drift",
          result: "passed",
          outputSummary: "Demo executed with intentional drift.",
        },
      ],
      validationResult: "passed",
      deviationsFromPrompt: ["Changed package.json outside the allowed areas."],
      risks: ["Forbidden change reported for demonstration."],
      nextStepRecommendation: "halt_for_admin",
    }
  : {
      id: "demo-beta-result-001",
      taskPromptId: alphaPlan.recommendedFirstBetaTask.id,
      submittedAt: now,
      filesChanged: ["src/domain/workflow.ts"],
      behaviorChanged:
        "Added a small domain-model contract within the allowed task scope.",
      validationRun: [
        {
          command: "npm run demo",
          result: "passed",
          outputSummary: "Demo executed one Alpha/Beta loop.",
        },
      ],
      validationResult: "passed",
      deviationsFromPrompt: [],
      risks: [],
      nextStepRecommendation: "continue",
    };

const alphaReview = reviewBetaResult({
  betaTaskPrompt: alphaPlan.recommendedFirstBetaTask,
  betaResultReport,
  reviewedAt: now,
});

printSection("ADMIN Idea Prompt", ideaText);
printSection("ALPHA Development Plan", {
  status: alphaPlan.status,
  proposedApplicationGoal: alphaPlan.developmentPlan.proposedApplicationGoal,
  likelyUserRoles: alphaPlan.developmentPlan.likelyUserRoles,
  coreUserFlows: alphaPlan.developmentPlan.coreUserFlows,
  initialTechnicalAssumptions:
    alphaPlan.developmentPlan.initialTechnicalAssumptions,
  approvalRequired: alphaPlan.developmentPlan.approvalRequired,
});
printSection("ALPHA Beta Task Prompt", {
  taskTitle: alphaPlan.recommendedFirstBetaTask.taskTitle,
  exactGoal: alphaPlan.recommendedFirstBetaTask.exactGoal,
  allowedFilesOrAreas: alphaPlan.recommendedFirstBetaTask.allowedFilesOrAreas,
  forbiddenChanges: alphaPlan.recommendedFirstBetaTask.forbiddenChanges,
  acceptanceChecks: alphaPlan.recommendedFirstBetaTask.acceptanceChecks,
});
printSection("Manual BETA Result Report", betaResultReport);
printSection("ALPHA Review", {
  decision: alphaReview.decision,
  workflowStatus: alphaReview.statusAfterReview,
  driftRisk: alphaReview.driftRisk,
  reviewFindings: alphaReview.reviewFindings,
  nextTaskReady: alphaReview.nextTaskReady,
});

function printSection(title: string, value: unknown): void {
  console.log(`\n## ${title}`);
  if (typeof value === "string") {
    console.log(value);
    return;
  }

  console.log(JSON.stringify(value, null, 2));
}

