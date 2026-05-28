import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(
  new URL("../src/ui/App.tsx", import.meta.url),
  "utf8",
);

const requiredLabels = [
  "Codemiister",
  "ADMIN",
  "ALPHA",
  "BETA",
  "Admin Idea",
  "Alpha Plan",
  "Beta Task",
  "Beta Result",
  "Alpha Review",
  "Transcript",
  "Deferred capabilities",
  "Execution readiness",
  "Readiness status",
  "Blockers",
  "Warnings",
  "Normalized allowed areas",
  "Normalized forbidden changes",
  "Execution Request Package",
  "Copy request package",
  "packageType",
  "betaTask",
  "executionReadiness",
  "noExecutionStatement",
  "Execution Result Package Validation",
  "Execution result package JSON",
  "Validate package",
  "Validation errors",
  "No-external-validation claim",
  "Use package result for Alpha review",
  "BETA-reported",
  "Package betaResultReport loaded into BETA Result JSON",
  "Manual Execution Handoff",
  "Codemiister does not execute Codex automatically.",
  "Execution packages are local/manual handoff artifacts.",
  "Result packages are reported artifacts, not independently verified facts.",
  "ADMIN remains in control.",
];

for (const label of requiredLabels) {
  assert.equal(
    appSource.includes(label),
    true,
    `UI smoke check failed: missing "${label}" in src/ui/App.tsx`,
  );
}

console.log("ui smoke validation passed");
