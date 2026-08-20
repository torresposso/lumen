# 01 — Progressions surface vocabulary and args spec

Type: implementation
Status: ready-for-agent
Blocks: 02-progressions-engine-and-sol-luna-cycle, 03-cli-integration-and-e2e

## Goal

Add the CLI command surface tokens and argument parsing/validation logic for `lumen chart progressions <uuid> --when "..."`.

## Requirements

1. Update `src/cli/surface.ts` with progression command tokens (`CHART_ARMS.progressions`, `CHART_ARM_HELP.progressions`).
2. Add `CHART_PROGRESSIONS_SPEC` in `src/domain/transit-input.ts` (accepting 1 positional UUID, requiring `--when`).
3. Ensure validation returns AXI `VALIDATION_ERROR` when `--when` is missing or malformed.
