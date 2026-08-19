# 04 — port-module-layout

Type: grilling
Status: resolved

## Question

How do the v1 modules land in v2's `src/`?

Map v1's `src/core/{reading,charts,evolutionary-reading,classical,projection,types}.ts` + `src/adapters/ephemeris-gateway.ts` + `src/commands/{chart,intake}.ts` onto the current v2 tree (`src/core/{args,subcommand,cli-surface}.ts`, `src/commands/`, profile store). Decide:

- **Seams**: where the ephemeris gateway / caelus adapter sits in v2; what the profile store port hands to chart (birthJdUt/birthLat/birthLon → chart request).
- **What dies**: projection; classical's atoms → structured (patterns/signature keep, atom lists die); the assembly shape follows 02.
- **TOON policy**: where serialization happens (per-block renderer? scalar rules from 02).
- **Dependencies**: module graph of the ported code; what v2 already provides (args, subcommand, cli-surface).

Close this ticket when the target layout is unambiguous enough to implement.

## Context

- Output structure: 02 (prototype).
- v1 code at git `297b08e`; v2 tree on current `main` (`src/**`, `CONTEXT.md`).

## Answer

Resolved by decision (2026-08-18):

1. **Ephemeris Seam (`src/adapters/ephemeris.ts`)**:
   - `EphemerisGateway` implements an `Ephemeris` interface wrapping `caelus` `Engine.chartAt`.
   - Allows deterministic offline testing with mocks/stubs without mutating core calculations.

2. **Core Domain Calculations (`src/core/astrology/` & `src/core/chart.ts`)**:
   - **Deep Entry Point**: `src/core/chart.ts` exposes `computeNatalChart(profile: Profile, ephemeris?: Ephemeris): NatalChartOutput`.
   - **Submodules** under `src/core/astrology/`:
     - `positions.ts` (Porphyry house calculation, true node, planet positions, aspects, declination aspects)
     - `soul.ts` (Pluto, PPP, midpoint/anti-midpoint)
     - `nodes.ts` (Nodal axis, rulers, placements, skipped steps)
     - `phases.ts` (Sol-Luna phase)
     - `dispositors.ts` (Dispositor chains)
     - `eclipses.ts` (Prenatal solar/lunar eclipses)
     - `patterns.ts` (Aspect patterns, elemental/modality signature, house rulers)
   - **What dies**: Projection layer, flat `atoms: string[]` lists, separate evo/interpretation blocks, draconic/journey/karma commands.

3. **TOON Serializer (`src/core/toon.ts`)**:
   - Helper `formatNatalChartToon(chart: NatalChartOutput): string` ensures deterministic key order and 2-space indentation matching prototype 02.

4. **CLI Command (`src/commands/chart.ts`)**:
   - Single exported entry point `chartCommand` built via `createSubcommandGroup` for `lumen chart natal <uuid>`.
   - Wired in `src/cli.ts`.

