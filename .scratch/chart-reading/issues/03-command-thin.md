---
id: 03-command-thin
type: task
status: resolved
blockers: [01-docs-reading]
---

**¿Sirve a mi Nodo Norte?** Sí — un command que solo gluea (parseo → core → TOON)
es el único contrato que el agente necesita leer para entender la superficie.

## Objetivo

Reducir `src/commands/chart.ts` a AXI glue puro.

## Cambios

1. Borrar de `src/commands/chart.ts`: `AstrologicalEngine` (clase), `chartFor`,
   `compute()`, `echoBirth`, `DROPPED_NODE`, `ChartOutputSelection`,
   `BirthEcho`, `AstrologicalReading` y los re-exports de classical
   (`AspectPattern`, `ChartSignature`, `DeclinationAspectProjection`,
   `DraconicChart`, `InterpretationContext`). Sin imports muertos.
2. Importar `computeReading` desde `../core/reading`; `chartCommand` queda:
   `const reading = computeReading(request, new CaelusEphemeris(), { evo })`,
   con `if (evo && reading === undefined)` → `AxiError("Could not compute
   evolutionary mechanics", "CALCULATION_ERROR", ["The chart must contain pluto
   and the true node (the default natal bodies); --bodies only adds extra bodies"])`.
3. Se conserva: usage strings, `FLAG_REFERENCE`, `usageFor`, `CHART_MODES`,
   `applyMode`, `resolveRequest`, `parseEvoFlag`, `chartCommand`.
4. Actualizar el comentario de cabecera ("application layer; core stays pure").

## Criterios de aceptación

- `chartCommand` es la única exportación (con los usage strings y
  `chartUsage`/`chartNatalUsage`/`chartDraconicUsage` que los tests usan).
- `tests/commands/chart.test.ts` y `tests/commands/profile.test.ts` pasan sin cambios.
- `bun run typecheck` y `bun test` en verde.

## Answer

- La clase `AstrologicalEngine`, `chartFor`, `compute()`, `echoBirth`,
  `DROPPED_NODE` y los tipos (`ChartOutputSelection`/`BirthEcho`/
  `AstrologicalReading` + re-exports de classical) eliminados de
  `commands/chart.ts`; `chartCommand` llama `computeReading(request,
  new CaelusEphemeris(), { evo })` con el guard del `AxiError` y narrowing
  explícito. `tests/commands/chart.test.ts` y `profile.test.ts` pasan sin
  cambios; typecheck y suite en verde.