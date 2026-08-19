# 05 — chart-natal-command-surface

Type: prototype

Blocked by: 02

## Question

What does the chart natal surface look like on the v2 CLI?

Prototype the concrete surface:

- Usage/help text for `lumen chart natal <uuid>` (uuid positional; no inline flags — charting decision).
- Runner wiring: `chart` subcommand → `natal` sub-subcommand on v2's subcommand machinery.
- Errors: profile not found → AXI `NOT_FOUND`; invalid uuid; caelus failure codes.
- TOON block headers and tokens for the output (per 02's shape).

Close this ticket when the surface is prototyped and the user has reacted.

## Context

- v2 CLI machinery: `src/cli.ts`, `src/commands/`, `src/core/{args,subcommand,cli-surface}.ts` on current `main`.
- Output shape: 02.
- v1 surface to adapt: `src/commands/chart.ts` at git `297b08e`.
