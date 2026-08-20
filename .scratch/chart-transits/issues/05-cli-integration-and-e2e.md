# 05 — CLI integration, TOON serialization, and E2E tests

Type: implementation
Status: resolved
Blocked-by: 01-command-surface-and-args, 04-transits-evolutionary-triggers


## Goal

Wire the transits calculation into `src/commands/chart.ts`, format the output as TOON, and ensure full test coverage and documentation parity.

## Requirements

1. Implement `src/engine/transits/index.ts` exporting `computeTransitChart(natalProfile, targetInput, ephemeris)`.
2. Add `transits` subcommand to `src/commands/chart.ts`.
3. Support UUID lookup from `ProfileStore`, failing with `NOT_FOUND` if absent.
4. Serialize `TransitChartOutput` to TOON format with standard formatting rules.
5. Verify parity with `bun run check:docs` and add E2E CLI test suite in `tests/commands/chart-transits.test.ts`.

## Verification

- `bun test` passes 100%.
- `bun run check:docs` passes.
- CLI smoke tests with synthetic profiles producing expected TOON output.
