# 03 — Transits aspects and house projections

Type: implementation
Status: resolved
Blocked-by: 02-transits-engine-types-and-adapter
Blocks: 04-transits-evolutionary-triggers


## Goal

Implement the geometric projection of transiting bodies into natal houses and calculate inter-chart aspects with canonical orbs and applying/separating classification.

## Requirements

1. Create `src/engine/transits/aspects.ts`.
2. Project transiting bodies onto the natal Porphyry house cusps to determine `natalHouse: number`.
3. If `--where` is provided, calculate `localHouse: number` in the transit chart's own houses.
4. Calculate aspects between transiting bodies and natal points (luminares, inner, outer planets, nodes, angles).
5. Apply canonical evolutionary transit orbs (1.5° inner, 2.5° outer/transpersonal).
6. Calculate `isApplying: boolean` using relative longitudinal speeds.
7. Classify each aspect into `"stressful"` or `"nonstressful"`.

## Verification

- Unit tests covering known aspect pairs, exact vs separating vs applying motions, and house projections.
