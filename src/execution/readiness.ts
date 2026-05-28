import type { BetaTaskPrompt } from "../domain/workflow.ts";

const OVERLY_BROAD_PHRASES = [
  "build the whole app",
  "implement everything",
  "refactor the project",
  "rewrite the app",
  "add full automation",
] as const;

const TOO_BROAD_ALLOWED_AREAS = new Set([
  ".",
  "/",
  "\\",
  "src",
  "src/",
  "repository root",
  "repo root",
  "root",
]);

export interface ExecutionReadinessReport {
  ready: boolean;
  blockers: string[];
  warnings: string[];
  normalizedAllowedAreas: string[];
  normalizedForbiddenChanges: string[];
}

export function evaluateExecutionReadiness(
  betaTaskPrompt: BetaTaskPrompt,
): ExecutionReadinessReport {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const normalizedAllowedAreas = normalizeAllowedAreas(
    betaTaskPrompt.allowedFilesOrAreas,
  );
  const normalizedForbiddenChanges = normalizeTextList(
    betaTaskPrompt.forbiddenChanges,
  );
  const normalizedAcceptanceChecks = normalizeTextList(
    betaTaskPrompt.acceptanceChecks,
  );
  const normalizedValidationSuggestions = normalizeTextList(
    betaTaskPrompt.validationCommandSuggestions,
  );

  if (!normalizeText(betaTaskPrompt.exactGoal)) {
    blockers.push("BETA task must include an exact goal.");
  }

  if (normalizedAllowedAreas.length === 0) {
    blockers.push("BETA task must include allowed files or allowed areas.");
  }

  if (normalizedForbiddenChanges.length === 0) {
    blockers.push("BETA task must include forbidden changes.");
  }

  if (normalizedAcceptanceChecks.length === 0) {
    blockers.push("BETA task must include acceptance checks.");
  }

  const broadPhrase = findOverlyBroadPhrase(betaTaskPrompt);
  if (broadPhrase) {
    blockers.push(
      `BETA task appears overly broad because it includes "${broadPhrase}".`,
    );
  }

  if (normalizedValidationSuggestions.length === 0) {
    warnings.push("BETA task has no validation command suggestions.");
  }

  if (normalizedAllowedAreas.some(isAllowedAreaTooBroad)) {
    warnings.push(
      "BETA task allowed files/areas include a broad repository-level scope.",
    );
  }

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
    normalizedAllowedAreas,
    normalizedForbiddenChanges,
  };
}

function findOverlyBroadPhrase(betaTaskPrompt: BetaTaskPrompt): string | null {
  const taskIntent = [
    betaTaskPrompt.taskTitle,
    betaTaskPrompt.exactGoal,
    ...betaTaskPrompt.implementationSteps,
  ]
    .join(" ")
    .toLowerCase();

  return (
    OVERLY_BROAD_PHRASES.find((phrase) => taskIntent.includes(phrase)) ?? null
  );
}

function isAllowedAreaTooBroad(area: string): boolean {
  const normalizedArea = area.replace(/\/+$/g, "") || area;

  return (
    TOO_BROAD_ALLOWED_AREAS.has(area.toLowerCase()) ||
    TOO_BROAD_ALLOWED_AREAS.has(normalizedArea.toLowerCase())
  );
}

function normalizeAllowedAreas(values: string[]): string[] {
  return normalizeTextList(values).map((value) => value.replace(/\\/g, "/"));
}

function normalizeTextList(values: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const cleanedValue = normalizeText(value);
    const key = cleanedValue.toLowerCase();

    if (!cleanedValue || seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(cleanedValue);
  }

  return normalized;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}
