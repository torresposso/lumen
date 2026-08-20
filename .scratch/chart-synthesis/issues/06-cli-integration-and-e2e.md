# Issue 06: CLI Integration and E2E Tests for `lumen chart synthesis`

## Scope

1. Add `CHART_ARMS.synthesis` and `SYNTHESIS_FLAGS` to `src/cli/surface.ts`.
2. Add `synthesis` handler to `src/commands/chart.ts`.
3. Validate AXI errors (`NOT_FOUND`, `VALIDATION_ERROR`).
4. End-to-end tests in `tests/commands/chart-synthesis.test.ts`.
5. Run full test suite, Biome linting, and `bun run check:docs`.
