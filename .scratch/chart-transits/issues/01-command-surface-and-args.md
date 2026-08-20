# 01 — Command surface and args validation for chart transits

Type: implementation
Status: resolved
Blocks: 02-transits-engine-types-and-adapter, 05-cli-integration-and-e2e


## Goal

Add the CLI command surface tokens and argument parsing/validation logic for `lumen chart transits <uuid> --when "..." [--where "..."]`.

## Requirements

1. Update `src/cli/surface.ts` with transit command tokens, flags, and catalog descriptions.
2. Extend args parsing in `src/cli/args.ts` to support optional `--where` and mandatory `--when` on `chart transits`.
3. Reuse `parseRawBirthInput` or create a flag-agnostic instant parser for `--when` (and optional `--where`) to derive `targetJdUt`.
4. Ensure validation returns AXI `VALIDATION_ERROR` with actionable suggestions when `--when` is missing/malformed or `--where` is invalid.

## Verification

- Unit tests verifying args validation for missing UUID, missing `--when`, malformed `--when`, valid `--where`, and invalid coordinates.
