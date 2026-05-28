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
];

for (const label of requiredLabels) {
  assert.equal(
    appSource.includes(label),
    true,
    `UI smoke check failed: missing "${label}" in src/ui/App.tsx`,
  );
}

console.log("ui smoke validation passed");
