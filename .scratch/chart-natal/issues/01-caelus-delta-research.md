# 01 — caelus-delta-research

Type: research
Status: claimed

## Question

What changed in caelus between v1's floor (`^0.23.0`) and the current npm release (`0.24.1`), and does the v1 port still work on each?

Decision 03 (caelus-version-pin) needs evidence to choose the pin. Research must surface:

- **House systems**: confirm caelus exposes `porphyry` as a `HouseSystem` value and computes it at every latitude — angle-derived, so no polar fallback (the charting decision relies on this).
- **Chart API**: `ChartAt` / `Chart` / positions — signatures and named exports. The v1 port calls `chart(chartAt, { … })` with options (house system, node). Confirm true-node support and the options shape on both versions.
- **Breaking changes 0.23.0 → 0.24.1**: diffs to named exports, option types, return shapes (bodies/angles/cusps/aspects), version field, deps (swisseph bundle) that would touch the ported `ephemeris-gateway` / `charts.ts` code.
- **Evidence record**: exact npm versions, changelog/release notes links, type/API excerpts.

Close this ticket when a decision on 03 is possible without further research.

## Context

- v1 code to port: `src/adapters/ephemeris-gateway.ts`, `src/core/charts.ts` at git `297b08e`.
- v1 manifest floor: `caelus ^0.23.0` (v1 `package.json`).
- Findings land on branch `research/caelus-delta`, file `.scratch/chart-natal/research/01-caelus-delta.md`, with a context pointer back here.
