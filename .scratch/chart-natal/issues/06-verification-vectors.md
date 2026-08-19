# 06 — verification-vectors-with-porphyry

Type: grilling

Blocked by: 02, 03

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
