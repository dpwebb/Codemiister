export const WORKFLOW_STATUSES = [
  "idea_received",
  "alpha_planning",
  "admin_approval_required",
  "approved_for_beta",
  "beta_task_issued",
  "beta_result_received",
  "alpha_reviewing",
  "revision_required",
  "next_task_ready",
  "production_ready",
  "halted",
] as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export const DRIFT_RISK_LEVELS = ["low", "medium", "high", "blocked"] as const;

export type DriftRiskLevel = (typeof DRIFT_RISK_LEVELS)[number];

export interface DriftRisk {
  level: DriftRiskLevel;
  reasons: string[];
  betaOverreachDetected: boolean;
  haltRecommended: boolean;
}

export interface AdminIdeaPrompt {
  id: string;
  submittedAt: string;
  goal: string;
  targetUsers?: string[];
  constraints?: string[];
}

export interface AlphaQuestionToAdmin {
  id: string;
  askedAt: string;
  question: string;
  materialImpact: string;
  status: "open" | "answered" | "withdrawn";
}

export interface AlphaDevelopmentPlan {
  id: string;
  ideaPromptId: string;
  createdAt: string;
  summary: string;
  proposedApplicationGoal: string;
  productDirection: string;
  likelyUserRoles: string[];
  coreUserFlows: string[];
  initialTechnicalAssumptions: string[];
  implementationStages: string[];
  approvalRequired: boolean;
  driftControlsForBeta: string[];
  recommendedFirstBetaTaskId?: string;
  questionsForAdmin?: AlphaQuestionToAdmin[];
}

export interface AdminApprovalDecision {
  id: string;
  planId: string;
  decidedAt: string;
  decision: "approved" | "rejected" | "revision_requested";
  gate: string;
  notes?: string;
}

export interface BetaTaskPrompt {
  id: string;
  planId: string;
  issuedAt: string;
  taskTitle: string;
  exactGoal: string;
  allowedFilesOrAreas: string[];
  forbiddenChanges: string[];
  implementationSteps: string[];
  acceptanceChecks: string[];
  validationCommandSuggestions: string[];
  expectedResultReportFormat: string[];
  stopConditions: string[];
}

export type ValidationResultStatus = "passed" | "failed" | "not_run";

export interface ValidationRun {
  command: string;
  result: ValidationResultStatus;
  outputSummary?: string;
}

export interface BetaResultReport {
  id: string;
  taskPromptId: string;
  submittedAt: string;
  filesChanged: string[];
  behaviorChanged: string;
  validationRun: ValidationRun[];
  validationResult: ValidationResultStatus;
  deviationsFromPrompt: string[];
  risks: string[];
  nextStepRecommendation: AlphaReviewDecision;
}

export type AlphaReviewDecision =
  | "continue"
  | "request_revision"
  | "halt_for_admin";

export interface AlphaReview {
  id: string;
  resultReportId: string;
  reviewedAt: string;
  evidenceReviewed: string[];
  reviewFindings: string[];
  driftRisk: DriftRisk;
  decision: AlphaReviewDecision;
  statusAfterReview: WorkflowStatus;
  nextTaskReady: boolean;
  notes?: string;
}

export interface AlphaBetaWorkflowLoop {
  id: string;
  status: WorkflowStatus;
  ideaPrompt: AdminIdeaPrompt;
  developmentPlan?: AlphaDevelopmentPlan;
  adminApproval?: AdminApprovalDecision;
  betaTask?: BetaTaskPrompt;
  betaResult?: BetaResultReport;
  alphaReview?: AlphaReview;
  haltReason?: string;
}
