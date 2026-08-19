# 04 — port-module-layout

Type: grilling

Blocked by: 02

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
