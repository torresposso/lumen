# ADR-0012 — Deepen Natal Engine via Single-Module Consolidation

Consolidate `src/engine/aspects.ts` and `src/engine/natal.ts` into a single deep module `src/engine/natal.ts`, exposing `computeNatalChart(profile, ephemeris)` as the sole public interface.

## Context & Problem

In ADR-0010 and ADR-0011, `src/engine/` was structured as two files: `aspects.ts` (geometric projections & aspect definitions) and `natal.ts` (evolutionary synthesis & entry point).

However, `aspects.ts` failed the **deletion test**:
1. It exposed 16 types, constants, and helper functions consumed strictly by `natal.ts` with zero external callers.
2. The separation was purely artifactual (splitting file length), fragmenting locality and leaking internal domain mechanics across an unnecessary file seam.
3. Declination aspect calculations manually reiterated pairwise loops in TypeScript instead of directly querying the `Ephemeris` port.

## Decision

1. **Absorb `aspects.ts` into `src/engine/natal.ts`**:
   - `src/engine/natal.ts` becomes a canonical deep module: a rich, robust JWGEA evolutionary calculation engine hidden behind a minimal, pure function interface: `computeNatalChart(profile: Profile, ephemeris?: Ephemeris): NatalChartOutput`.
   - Internal helper routines (`evaluatePlutoAspects`, `evaluatePPPAspects`, `evaluateNodeAspects`, `detectSkippedSteps`, `buildDispositorChain`, `projectPoint`, `projectEclipticGeometry`) become private implementation details inside `natal.ts`.
   - Delete `src/engine/aspects.ts`.
2. **Direct Ephemeris Seam for Declination Aspects**:
   - Query `ephemeris.declinationAspects` during chart geometric projection, removing duplicate pairwise iteration in engine code.
3. **Update Documentation & Layout**:
   - `.scratch/chart-natal/spec.md` (§8) and `CONTEXT.md` updated to reflect the single deep engine module.
