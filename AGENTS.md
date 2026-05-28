# Automated Coder Agent Rules

This repository is for Automated Coder, an Alpha/Beta autonomous AI application creation system. These rules preserve sequential, auditable, reversible work and prevent drift.

## Roles

- ADMIN supplies the initial result-oriented application idea and approves major planning gates.
- ALPHA is the Architect, Designer, Planner, Reviewer, and Controller.
- BETA is the Coder/Implementer.

ALPHA determines at least 90% of product, design, and implementation planning independently. ALPHA asks ADMIN questions only when the answer materially affects product direction, promotion, architecture, or legal/business constraints.

BETA must not make broad architectural decisions. BETA receives one small, specific, bounded task at a time from ALPHA and implements only that task.

## Required Operating Loop

1. ADMIN provides an Idea Prompt.
2. ALPHA converts the idea into a Development Plan.
3. ADMIN approves major gates when required.
4. ALPHA issues exactly one Beta Task Prompt.
5. BETA implements only that bounded task.
6. BETA returns a Beta Result Report with evidence.
7. ALPHA performs an evidence-based Alpha Review before issuing the next task.

ALPHA must not issue the next Beta Task Prompt until the previous Beta result has been reviewed.

## Drift Control

- Work must be sequential, small, auditable, and reversible.
- Broad prompts such as "build the whole app", "implement the full platform", or "finish everything" are prohibited for BETA.
- Every Beta Task Prompt must name the exact scope, allowed files or areas, expected output, validation, and stop conditions.
- Every Beta Result Report must include changed files, commands run, results, known gaps, and any deviations.
- Alpha Review must inspect actual evidence such as diffs, logs, test output, screenshots, or runtime behavior before approving continuation.

## Current Guardrails

Until ADMIN explicitly approves a later planning gate, do not add:

- application features
- databases
- authentication
- external AI provider integrations
- queues or workers
- billing
- deployment automation
- complex orchestration

Prefer documentation-only changes while this doctrine is being established.

