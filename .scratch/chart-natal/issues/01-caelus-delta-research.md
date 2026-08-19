# 01 — caelus-delta-research

Type: research
Status: resolved

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

## Answer

Resolved by research subagent (2026-08-18), committed on branch `research/caelus-delta` (`3148207`). Full evidence: `.scratch/chart-natal/research/01-caelus-delta.md`.

1. **Porphyry houses: available and safe on both versions.** `porphyry` is a `HouseSystem` member on 0.23.0 and 0.24.1; `housesPorphyry(asc, mc)` is angle-derived (no latitude, no throw path). The whole-sign polar fallback fires only on `RangeError`, which only Placidus/Koch can raise — no fallback needed at 85°N. Verified by running the v1 call path against both published tarballs.
2. **Chart API unchanged.** Surface is `Engine` + `Chart` + positions (no `ChartAt` class). `Engine.chartAt(jdUt, lat, lonEast, opts?)` is identical; the v1 call `chartAt(jd, lat, lon, { houseSystem, zodiac, bodies, topocentric })` is a valid `ChartOptions` on both. `true_node` is a default body (no boolean option), always resolves.
3. **Breaking changes 0.23.0 → 0.24.1: none touch the ported code.** Additive only: `Chart.warnings` (required; `[]` for modern dates), `Position.latSpeed?`, `ChartOptions.separation?`/`aspects?`, `PackedBody` widened (type-level only). Numeric: two 0.24.0 fixes in `plutoApparent`/`chironApparent` (aberration lat + precession ordering) — measured deltas tiny (Pluto lat +3.05″, lon −0.027″). **`0.24.0` is deprecated on npm (incomplete tarball) — never pin it; `^0.23.0` resolves to 0.24.1.**
4. **Verdict:** the port runs unchanged on both 0.23.0 and 0.24.1 → ticket 03 decides on reproducibility/maintenance grounds, not compatibility.
