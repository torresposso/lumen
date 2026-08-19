# 06 — verification-vectors-with-porphyry

Type: grilling
Status: resolved

## Question

How do we verify the ported chart natal?

v1's vectors used Placidus houses (default) — Porphyry changes houses, so expected values must be recalculated. Decide the strategy:

- Which charts anchor the vectors: the Tampa anchor (1990-06-10 14:30 America/New_York) + v1's known test charts.
- Which layers get vectors: geometry (bodies/angles/cusps/aspects), canon facts (pluto/ppp/nodalAxis/phase/dispositorChains/prenatalEclipses), patterns/signature, method/counts.
- Source of truth: recompute with the pinned engine (03) vs hand-checked values; how much of v1's suite ports vs rewrites; snapshot vs unit vectors.

Close this ticket when the strategy is decided and written down.

## Context

- Engine version: 03 (pin). Output shape: 02.
- v1 test suite at git `297b08e`: `tests/core/{reading,charts,classical,evolutionary-reading,fact-atoms,evo-atoms,chart-patterns,prenatal-eclipses}.test.ts`, `tests/commands/chart.test.ts`, `tests/cli/natal-intake.test.ts`.

## Answer

Resolved by decision (2026-08-18):

1. **Golden Vector Anchor**:
   - Primary test anchor: **Tampa Anchor** (`1990-06-10T14:30-04:00`, `27.9506, -82.4572`) matching prototype `prototypes/02-output-structure.md`.
   - Edge cases: High latitude (e.g. Tromsø 69.6°N / 85°N) ensuring Porphyry house calculation without polar fallbacks; Southern hemisphere; PPP deactivation (Pluto conjunct True Node <= 3°); Skipped steps.

2. **Testing Layers**:
   - **Adapters (`tests/adapters/ephemeris.test.ts`)**: Caelus integration, Porphyry houses and True Node coordinates.
   - **Domain Calculations (`tests/core/astrology/*.test.ts`)**: Unit tests for soul (Pluto/PPP/midpoints), nodes (skipped steps, rulers), phases, dispositors, prenatal eclipses, and aspect patterns.
   - **Assembler (`tests/core/chart.test.ts`)**: Golden vector end-to-end verification of `computeNatalChart`.
   - **CLI & AXI Standards (`tests/commands/chart.test.ts`, `tests/cli.test.ts`)**: Subcommand execution, TOON rendering, and error handling (`NOT_FOUND`, `VALIDATION_ERROR`).

