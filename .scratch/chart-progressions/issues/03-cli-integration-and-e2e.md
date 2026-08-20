# 03 — CLI integration, TOON serialization, and E2E tests

Type: implementation
Status: ready-for-agent
Blocked-by: 01-progressions-surface-and-args, 02-progressions-engine-and-sol-luna-cycle

## Goal

Wire `progressions` subcommand into `src/commands/chart.ts` and verify with full test suite and doc parity.

## Requirements

1. Add `progressions` arm to `src/commands/chart.ts`.
2. Ensure `bun run check:docs` verifies parity with `.scratch/chart-progressions/spec.md`.
3. Add E2E tests in `tests/commands/chart-progressions.test.ts`.
4. Verify all tests pass 100%.
