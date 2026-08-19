# ADR-0014 — Deepening Domain Intake and Command Surface Architecture

Consolidate `src/domain/jd.ts` into `src/domain/birth-input.ts` and `src/cli/home.ts` into `src/cli/surface.ts`, eliminating shallow pass-through modules and concentrating domain and presentation mechanics.

## Context & Problem

In prior iterations:
1. `src/domain/jd.ts` contained calendar checks (`daysInMonth`, `isLeapYear`) and Meeus arithmetic (`julianDayUt`) used exclusively by `src/domain/birth-input.ts`. The separation fragmented the birth intake seam without offering independent leverage or distinct adapters.
2. `src/cli/home.ts` was an 18-line pass-through module querying `store.list()` and calling `surface.emptyStateHint`. Presentation logic was split artificially between vocabulary (`surface.ts`) and view composition (`home.ts`).

Both modules failed the **deletion test**: deleting them concentrates complexity into canonical deep modules (`birth-input.ts` and `surface.ts`) with zero loss of capability.

## Decision

1. **Deepen Birth Input Intake Module**:
   - Absorb Meeus Julian Day arithmetic and Gregorian calendar validation directly into `src/domain/birth-input.ts`.
   - `parseBirthInput` serves as the single, pure domain intake interface.
   - Delete `src/domain/jd.ts` and fold its arithmetic tests into `tests/birth-input.test.ts`.
2. **Consolidate Command Surface & Home View**:
   - Move `homeView` into `src/cli/surface.ts`, uniting CLI vocabulary and bare invocation presentation.
   - Delete `src/cli/home.ts` and merge its view tests into `tests/cli-surface.test.ts`.
3. **Update Documentation & Layout**:
   - Update `CONTEXT.md` and `.scratch/chart-natal/spec.md` (§8) to reflect the deepened source tree.
