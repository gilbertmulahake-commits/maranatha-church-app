# AGENTS.md — Maranatha Faith Assemblies Kenya Collection System

Read this before any implementation or architectural decision.

## How we work together

You are the implementation engine. I am the driver.

- You give me instructions; I execute manually in VS Code on Windows CMD.
- You have no filesystem, terminal, or repository access.
- I paste output back to you; you analyse and issue the next step.
- One step at a time. Never a wall of commands.
- Nothing runs automatically.

Your job is to execute what the specs and context files already define. Do not infer or invent behaviour. If a requirement is missing or ambiguous, resolve it in the appropriate context file before implementing.

## Read order

Read these in order before any implementation work:

1. `context/ai-workflow-rules.md` — workflow, scoping, protected files, closing gate
2. `context/project-overview.md` — product definition, goals, features, scope
3. `context/architecture.md` — stack, boundaries, storage, **invariants**
4. `context/ui-context.md` — design system, component standards
5. `context/code-standards.md` — domain rules, guards, frontend rules
6. `context/progress-tracker.md` — current phase, decisions, session notes
7. `context/specs/00-build-plan.md` — unit sequence

Then read the current unit's spec at `context/specs/NN-name.md`.

**If the current unit's spec does not exist, STOP.** Author it first using `context/specs/_template.md`. Do not begin implementation against an unwritten spec.

Every spec contains these four sections in this order:

1. **Goal** — 1–2 sentences, concrete and verifiable
2. **Design** — visual/structural decisions, reference `ui-context.md` tokens
3. **Implementation (including Dependencies)** — sub-sections per component or system boundary; explicit file paths; packages not yet installed, with reason
4. **Verification Checklist** — specific, testable conditions

A spec missing any of these sections is not a spec. Stop and resolve it with the user before proceeding.

## Doc-sync rule

Update `context/progress-tracker.md` after each meaningful change.

If implementation changes the architecture, scope, or standards documented in any context file, update the affected file(s) **in the same session** — before continuing. Do not leave one file describing the old state.

## Protected files

Full list and reasoning in `context/ai-workflow-rules.md` → "Protected Files". Summary:

- `components/ui/*` — shadcn primitives; specific customised exceptions documented there
- `lib/utils.ts` — `twMerge` extension for custom Figma tokens; do not revert
- `prisma/migrations/*` — append-only; never edit a committed migration

Do not modify files outside the current spec's scope. If a change requires touching a file outside scope, stop and ask.

## Closing gate

Before marking any unit complete:

- `npx tsc --noEmit` — clean
- `npm run lint` — 0 warnings, 0 errors
- `npm run build` — passes with the expected page count
- No invariant in `context/architecture.md` violated
- `context/progress-tracker.md` reflects the completed work

Do not commit with a failing gate. Do not defer a failing gate to the next session.