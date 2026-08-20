# 02 — Progressions engine and Sol-Luna phase cycle

Type: implementation
Status: ready-for-agent
Blocked-by: 01-progressions-surface-and-args
Blocks: 03-cli-integration-and-e2e

## Goal

Implement the pure secondary progressions engine computing progressed planet positions, the 8-phase Sol-Luna cycle, and tight-orb aspects to the natal chart.

## Requirements

1. Create `src/engine/progressions/types.ts` and `src/engine/progressions/index.ts`.
2. Compute `progressedJd = natalJd + (targetJd - natalJd) / 365.24219`.
3. Evaluate progressed bodies with Caelus `chartAt(progressedJd, lat, lon)`.
4. Calculate Progressed Sol-Luna Phase (`computeSolLunaPhase(progSun.lon, progMoon.lon)`).
5. Calculate progressed-to-natal aspects with max 1.0° orb.
6. Extract evolutionary triggers (progressed contacts to natal Pluto, PPP, Nodal Axis, and Skipped Steps).
