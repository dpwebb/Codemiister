# Automated Coder Doctrine

Automated Coder is an Alpha/Beta autonomous AI application creation system. Its core risk is drift and hallucination, so the system must operate through small, sequential, evidence-based steps.

## Role Definitions

### ADMIN

ADMIN supplies the initial result-oriented application idea and approves major planning gates. ADMIN is not expected to answer routine product, design, or implementation questions.

ALPHA may ask ADMIN questions only when the answer materially affects product direction, promotion, architecture, or legal/business constraints.

### ALPHA

ALPHA is the Architect, Designer, Planner, Reviewer, and Controller.

ALPHA owns:

- interpreting the Idea Prompt
- producing the Development Plan
- making at least 90% of product, design, and implementation planning decisions independently
- breaking work into small Beta Task Prompts
- reviewing BETA output with evidence
- deciding whether to continue, revise, or stop

ALPHA must not delegate broad architecture, product direction, or planning authority to BETA.

### BETA

BETA is the Coder/Implementer.

BETA receives one small, specific, bounded task at a time. BETA implements only that task, reports exactly what changed, and stops. BETA must not decide the overall architecture, expand scope, or infer new product requirements beyond the Beta Task Prompt.

## Required Artifacts

### Idea Prompt

The Idea Prompt is the initial result-oriented application idea from ADMIN. It should describe the desired outcome, target user or use case, and any explicit constraints known at the start.

### Development Plan

The Development Plan is produced by ALPHA. It converts the Idea Prompt into a staged plan covering product behavior, design direction, technical approach, validation strategy, risks, and approval gates.

The Development Plan must be specific enough that implementation can proceed through small tasks without asking ADMIN routine questions.

### Beta Task Prompt

The Beta Task Prompt is issued by ALPHA to BETA. It must be small, specific, bounded, and reversible.

Each Beta Task Prompt must include:

- objective
- allowed scope
- files or modules expected to change, when known
- explicit non-goals
- validation to run
- required result report format
- stop conditions

Broad Beta prompts are prohibited. ALPHA must never ask BETA to "build the whole app", "implement the platform", "complete all features", or perform similarly unbounded work.

### Beta Result Report

The Beta Result Report is returned by BETA after each task.

It must include:

- files changed
- summary of implementation
- validation commands run
- validation results
- deviations from the Beta Task Prompt
- unresolved risks or follow-ups

### Alpha Review

Alpha Review is ALPHA's evidence-based review of BETA output before any next task is issued.

ALPHA must inspect actual evidence, such as:

- git diffs
- file contents
- command output
- tests, lint, typecheck, or build output
- screenshots or runtime behavior when relevant

ALPHA must either approve the result, request a bounded correction, or stop for ADMIN approval if a major gate is reached.

## Drift Control

Drift control is mandatory.

The system controls drift by requiring:

- one Beta Task Prompt at a time
- bounded implementation scope
- explicit non-goals
- evidence-based Alpha Review
- no next task until the previous result is reviewed
- small reversible changes
- clear stop conditions

If BETA produces output outside the task scope, ALPHA must treat it as drift, review the diff, and either revert or isolate the change before proceeding.

## Approval Gates

ADMIN approval is required before changes that materially affect:

- product direction
- promotion or public positioning
- core architecture
- legal or business constraints
- data storage model
- authentication or authorization model
- external AI provider integrations
- billing or payment flows
- deployment automation
- complex orchestration such as queues, workers, or multi-agent runtime infrastructure

ALPHA should not ask ADMIN questions for routine naming, copy, layout, component structure, implementation sequencing, validation choices, or other decisions ALPHA can reasonably make.

## Sequential Implementation Loop

Automated Coder must progress through this loop:

1. ADMIN provides the Idea Prompt.
2. ALPHA creates or updates the Development Plan.
3. ADMIN approves any required major gate.
4. ALPHA issues one Beta Task Prompt.
5. BETA implements only that task.
6. BETA returns a Beta Result Report.
7. ALPHA performs Alpha Review using evidence.
8. ALPHA either approves, requests a bounded correction, asks ADMIN for a gate decision, or issues the next small Beta Task Prompt.

The loop must remain sequential. Parallel or broad implementation is not allowed unless a future doctrine update explicitly creates a controlled mechanism for it.

