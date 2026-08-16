# ADR-0001: Zod at the intake seam, caelus types at the output

## Status

Accepted

## Context

The CLI takes raw `Record<string, string>` flag values and hand-validated them
(`requireNumber`, `normalizeHouseSystem` in a try/catch, an unchecked `as Zodiac`
cast). The chart output erased the engine's types (`bodies: Record<string,
unknown>`, a `[key: string]: unknown` index signature). Meanwhile caelus ships
exact types (`HouseSystem`, `Zodiac`, `BodyId`, `ChartBody`, `UTResult["status"]`)
and axi-sdk-js requires `AxiRenderable` (`string | Record<string, unknown>`) and
structured `AxiError(message, code, suggestions)`.

## Decision

- Add zod as the validation + type-derivation layer at the CLI intake seam only
  (`src/commands/intake.ts`): `birthSchema` and `optionsSchema` parse string values
  into typed domain values via `z.infer`, with type-guard refinements against
  caelus's exact unions (no `as` casts).
- `parseWith()` maps zod issues to `AxiError` with code
  `VALIDATION_ERROR` and per-flag suggestions. The SDK maps only
  `VALIDATION_ERROR` to exit code 2, which is the contract for CLI usage
  errors; true domain/engine failures keep non-validation codes and exit 1.
- Keep caelus's exported types as the single source of truth: `ResolvedBirth`'s
  status reuses `UTResult["status"]`, `bodies` are `BodyId[]`, and the chart
  output reuses `ChartBody` instead of `unknown`.
- `ChartOutput` is a `type` alias (not `interface`) so it satisfies
  `Record<string, unknown>` without an index signature that erases its members.

## Consequences

- CLI intake is now declarative: ranges are enforced (`month <= 12`, `lat` in
  [-90, 90]) and future chart types (draconic, synastry, solar arc) reuse the
  same schemas.
- Hand-rolled `requireNumber`/`requireString` in `flags.ts` were deleted; the
  string-level `parseFlags` stays.
- Zod is a runtime dependency; schemas live in `src/commands/intake.ts` and must stay
  zod's single point of contact with the codebase. `core/` and `storage/` validate
  with framework-free type guards instead.
