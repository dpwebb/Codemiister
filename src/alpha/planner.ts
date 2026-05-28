import type {
  AdminIdeaPrompt,
  AlphaDevelopmentPlan,
  AlphaQuestionToAdmin,
  BetaTaskPrompt,
  WorkflowStatus,
} from "../domain/workflow.ts";
import {
  createBetaTaskPromptFromAlphaPlan,
  type BetaTaskPromptBuilderInput,
} from "../beta/task.ts";

export interface AlphaPlannerInput {
  ideaPrompt: AdminIdeaPrompt;
  projectConstraints?: string[];
  existingProjectContextSummary?: string;
  now?: string;
}

export interface AlphaPlannerOutput {
  status: WorkflowStatus;
  developmentPlan: AlphaDevelopmentPlan;
  recommendedFirstBetaTask: BetaTaskPrompt;
}

const DRIFT_CONTROLS_FOR_BETA = [
  "Implement only the task objective; do not expand scope.",
  "Do not create application features outside the allowed scope.",
  "Do not add persistence, authentication, external AI calls, queues, workers, billing, or deployment automation unless explicitly scoped.",
  "Report changed files, validation results, deviations, and follow-ups before any next task is issued.",
];

export function createAlphaDevelopmentPlan(
  input: AlphaPlannerInput,
): AlphaPlannerOutput {
  const createdAt = input.now ?? new Date().toISOString();
  const planId = `alpha-plan-${input.ideaPrompt.id}`;
  const taskId = `beta-task-${input.ideaPrompt.id}-001`;
  const materialQuestions = createMaterialQuestions(input, createdAt);
  const approvalRequired = materialQuestions.length > 0;
  const constraints = [
    ...(input.ideaPrompt.constraints ?? []),
    ...(input.projectConstraints ?? []),
  ];

  const developmentPlan: AlphaDevelopmentPlan = {
    id: planId,
    ideaPromptId: input.ideaPrompt.id,
    createdAt,
    summary: `Plan the smallest auditable path toward: ${input.ideaPrompt.goal}`,
    proposedApplicationGoal: input.ideaPrompt.goal,
    productDirection:
      "Build a focused application incrementally through Alpha-planned, Beta-implemented tasks.",
    likelyUserRoles: input.ideaPrompt.targetUsers?.length
      ? input.ideaPrompt.targetUsers
      : ["ADMIN", "ALPHA", "BETA"],
    coreUserFlows: [
      "ADMIN submits a result-oriented Idea Prompt.",
      "ALPHA turns the idea into a structured Development Plan.",
      "ADMIN approves material planning gates when required.",
      "ALPHA issues one small Beta Task Prompt.",
      "BETA implements the bounded task and returns a Beta Result Report.",
      "ALPHA reviews evidence before approving the next task.",
    ],
    initialTechnicalAssumptions: [
      "Keep the first implementation local and deterministic.",
      "Represent workflow state with plain domain types before adding orchestration.",
      "Prefer small modules with explicit inputs and outputs.",
      ...constraints.map((constraint) => `Constraint: ${constraint}`),
      ...(input.existingProjectContextSummary
        ? [`Existing project context: ${input.existingProjectContextSummary}`]
        : []),
    ],
    implementationStages: [
      "Confirm doctrine and guardrails.",
      "Model the Alpha/Beta workflow.",
      "Add deterministic Alpha planning contract.",
      "Add evidence-based Alpha review contract.",
      "Only then consider runtime orchestration behind an approval gate.",
    ],
    approvalRequired,
    driftControlsForBeta: DRIFT_CONTROLS_FOR_BETA,
    recommendedFirstBetaTaskId: taskId,
    questionsForAdmin: materialQuestions.length ? materialQuestions : undefined,
  };
  const betaTaskInput: BetaTaskPromptBuilderInput = {
    plan: developmentPlan,
    taskId,
    issuedAt: createdAt,
    allowedFilesOrAreas: [
      "AGENTS.md",
      "docs/",
      "src/domain/",
      "src/alpha/",
      "src/beta/",
    ],
  };

  return {
    status: approvalRequired ? "admin_approval_required" : "approved_for_beta",
    developmentPlan,
    recommendedFirstBetaTask: createBetaTaskPromptFromAlphaPlan(betaTaskInput),
  };
}

function createMaterialQuestions(
  input: AlphaPlannerInput,
  askedAt: string,
): AlphaQuestionToAdmin[] {
  const questions: AlphaQuestionToAdmin[] = [];
  const promptText = [
    input.ideaPrompt.goal,
    ...(input.ideaPrompt.constraints ?? []),
    ...(input.projectConstraints ?? []),
  ]
    .join(" ")
    .toLowerCase();

  if (requiresMaterialApproval(promptText)) {
    questions.push({
      id: `alpha-question-${input.ideaPrompt.id}-001`,
      askedAt,
      question:
        "Does this idea require approved data, authentication, external provider, billing, deployment, or legal/business constraints before implementation begins?",
      materialImpact:
        "The answer changes product scope, architecture boundaries, or legal/business obligations.",
      status: "open",
    });
  }

  return questions;
}

function requiresMaterialApproval(promptText: string): boolean {
  const materialTerms = [
    "auth",
    "login",
    "database",
    "payment",
    "billing",
    "deploy",
    "production",
    "openai",
    "ai provider",
    "legal",
    "compliance",
  ];

  return materialTerms.some((term) => promptText.includes(term));
}
