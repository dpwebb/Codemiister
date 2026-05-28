import type {
  AlphaDevelopmentPlan,
  AlphaReview,
  BetaResultReport,
  BetaTaskPrompt,
} from "../domain/workflow.ts";

export type NextBetaTaskRecommendationKind =
  | "halt_for_admin"
  | "revision_required"
  | "next_task_ready";

export interface RecommendNextBetaTaskInput {
  plan: AlphaDevelopmentPlan;
  previousBetaTask: BetaTaskPrompt;
  betaResultReport: BetaResultReport;
  alphaReview: AlphaReview;
  issuedAt?: string;
}

export interface NextBetaTaskRecommendation {
  kind: NextBetaTaskRecommendationKind;
  adminMessage: string;
  nextTask?: BetaTaskPrompt;
}

export function recommendNextBetaTask(
  input: RecommendNextBetaTaskInput,
): NextBetaTaskRecommendation {
  if (input.alphaReview.decision === "halt_for_admin") {
    return {
      kind: "halt_for_admin",
      adminMessage:
        "No next BETA task is recommended. ADMIN must review the halt reason before any further implementation.",
    };
  }

  if (input.alphaReview.decision === "request_revision") {
    return {
      kind: "revision_required",
      adminMessage:
        "A bounded revision task is recommended before any new work is issued.",
      nextTask: createRevisionTask(input),
    };
  }

  return {
    kind: "next_task_ready",
    adminMessage:
      "A conservative manual-next-step task is available for ADMIN/ALPHA approval.",
    nextTask: createConservativeFollowUpTask(input),
  };
}

function createRevisionTask(input: RecommendNextBetaTaskInput): BetaTaskPrompt {
  const issuesToAddress = [
    ...input.betaResultReport.deviationsFromPrompt,
    ...input.betaResultReport.risks,
    ...input.alphaReview.reviewFindings,
  ];

  return {
    ...input.previousBetaTask,
    id: `${input.previousBetaTask.id}-revision-001`,
    issuedAt: input.issuedAt ?? input.alphaReview.reviewedAt,
    taskTitle: "Bounded revision for previous BETA task",
    exactGoal: `Revise only the previous BETA task output to address: ${formatInlineList(issuesToAddress)}.`,
    allowedFilesOrAreas: [...input.previousBetaTask.allowedFilesOrAreas],
    forbiddenChanges: [
      ...input.previousBetaTask.forbiddenChanges,
      "Do not make new architecture decisions.",
      "Do not expand beyond the previous BETA task scope.",
    ],
    implementationSteps: [
      "Read the previous BETA task, BETA result report, and Alpha review.",
      "Address only the failed validation, deviation, or review finding listed by ALPHA.",
      "Stay inside the previous task's allowed files or allowed areas.",
      "Do not add new product functionality or architecture.",
      "Return a revised BETA Result Report before any next task is issued.",
    ],
    acceptanceChecks: [
      "Every listed deviation, risk, or review finding is resolved or explicitly reported as unresolved.",
      "All changed files remain inside the previous task's allowed files or allowed areas.",
      "No new architecture, persistence, authentication, external AI calls, queues, workers, billing, or deployment automation are added.",
      "Validation is rerun or the reason it cannot be rerun is reported.",
      "The revised BETA Result Report includes files changed, behavior changed, validation, deviations, risks, and a next-step recommendation.",
    ],
    stopConditions: [
      "Stop if the revision requires work outside the previous allowed scope.",
      "Stop if resolving the issue requires a broad architecture decision.",
      "Stop if a forbidden change appears necessary.",
    ],
  };
}

function createConservativeFollowUpTask(
  input: RecommendNextBetaTaskInput,
): BetaTaskPrompt {
  return {
    ...input.previousBetaTask,
    id: `${input.plan.id}-manual-next-beta-task`,
    issuedAt: input.issuedAt ?? input.alphaReview.reviewedAt,
    taskTitle: "Manual next-step BETA recommendation",
    exactGoal:
      "Prepare only the next small, Alpha-approved follow-up from the current Development Plan. Do not invent product functionality or implement broad application behavior.",
    allowedFilesOrAreas: [...input.previousBetaTask.allowedFilesOrAreas],
    forbiddenChanges: [
      ...input.previousBetaTask.forbiddenChanges,
      "Do not treat this placeholder recommendation as approval to build the full app.",
      "Do not add product functionality that is not explicitly selected by ADMIN/ALPHA.",
      "Do not make broad architecture decisions.",
    ],
    implementationSteps: [
      "Read the current Alpha Development Plan and Alpha review.",
      "Confirm the exact next small scope with ADMIN/ALPHA before implementation.",
      "Keep any accepted work inside the allowed files or allowed areas.",
      "Do not continue beyond one bounded task.",
      "Return a BETA Result Report before any next task is issued.",
    ],
    acceptanceChecks: [
      "The next task is explicitly bounded and reviewable.",
      "The work stays inside the allowed files or allowed areas.",
      "No new product functionality is invented beyond the current Alpha Development Plan.",
      "No forbidden changes are made.",
      "Validation is run or the absence of validation tooling is reported.",
    ],
    stopConditions: [
      "Stop until ADMIN/ALPHA confirms the exact next small scope.",
      "Stop if the next step would require product, architecture, legal, deployment, or business approval.",
      "Stop if implementation would exceed one bounded task.",
    ],
  };
}

function formatInlineList(values: string[]): string {
  if (values.length === 0) {
    return "the Alpha review findings";
  }

  return values.join("; ");
}
