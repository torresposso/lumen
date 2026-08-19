# 05 — chart-natal-command-surface

Type: prototype
Status: resolved

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

## Answer

Resolved by decision (2026-08-18):

1. **Invocation & Grammar**:
   - `lumen chart natal <uuid>`
   - Exactly one positional argument (`uuid`). No inline birth flags (`--when`/`--where` belong exclusively to `lumen profile add`).
   - Rejection of extra flags or missing arguments via `AxiError` (`VALIDATION_ERROR`).

2. **Subcommand Wiring**:
   - Implemented via `createSubcommandGroup` in `src/commands/chart.ts`.
   - Dispatched at root `src/cli.ts` alongside `profileCommand`.

3. **Error Semantics**:
   - Unknown/missing UUID: `AxiError` with code `NOT_FOUND` and actionable hint `"Run \`lumen profile list\` to view available profiles"`.
   - Missing required positional: `AxiError` (`VALIDATION_ERROR`).

4. **TOON Output**:
   - Root response shape `{ chart: NatalChartOutput }` serialized to TOON format matching prototype `02-output-structure.md`.

