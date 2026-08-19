# 02 — single-block chart output structure

Type: prototype

## Question

What exactly does the one-block `chart` TOON output look like?

The charting session settled the direction: ONE `chart` object — measurements first, then flat canon-derived facts by relevance; no evo / interpretationContext blocks; duplicated atoms dead; unique atoms (patterns/signature/house rulers) structured. This ticket raises the fidelity: build the concrete skeleton to react to.

The prototype must pin down:

- **Exact key names and nesting**: birth echo (v2 profile fields), bodies, angles, cusps, aspects; then the flat canon keys (pluto, ppp, midpoint, antiMidpoint, nodalAxis, phase, dispositorChains, prenatalEclipses, patterns, signature); disclosures (method, counts); where summary/help live (inside chart vs shared siblings).
- **Ordering by relevance** — the JWGEA reading order within the canon facts.
- **Precision conventions**: degree formatting/rounding, house/sign display, TOON scalar rules.
- **Concrete sample**: TOON output for the Tampa anchor (1990-06-10 14:30 America/New_York → profile jdUt/lat/lon) with Porphyry houses — generated against v1 code or hand-computed, enough to react to the shape.

Close this ticket when the user has reacted to the skeleton and the block shape is unambiguous.

## Context

- Charting decisions: one block; Porphyry houses; true node only; UUID input.
- v1 code: `src/core/{reading,types,classical,evolutionary-reading}.ts` at git `297b08e` (shape to adapt); v1 spec at git `a7b904b` (`.scratch/chart-evo-siempre/spec.md`).
- v2 profile fields (current `main`): `id`, `name?`, `city`, `birth { local, offsetMinutes, lat, lon, jdUt }`.
