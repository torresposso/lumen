---
id: 02-reading-module
type: task
status: resolved
blockers: [01-docs-reading]
---

**¿Sirve a mi Nodo Norte?** Sí — el ensamblado en un solo módulo puro hace el
contrato navegable para el agente y elimina la fricción de un canon partido en
dos mecanismos.

## Objetivo

Crear `src/core/reading.ts` con el ensamblado completo de la lectura natal,
byte-idéntico a `AstrologicalEngine.compute`.

## Cambios

1. `src/core/reading.ts` (nuevo):
   - Tipos movidos: `ChartOutputSelection`, `BirthEcho`, `AstrologicalReading`.
   - Constante `DROPPED_NODE` y `echoBirth` movidas del command.
   - `computeReading(request: NatalRequest, ephemeris: Ephemeris, selection: ChartOutputSelection = { evo: false }): AstrologicalReading | undefined`.
   - Ensamblado: `chartAt` → `toDraconicChart` (opcional) → limpieza única de
     `mean_node` → `project()` (mismo set limpio) → help → `generateFactAtoms`
     → `computeEvolutionaryReading` (mismo set limpio; comentario del fallback
     inerte de `nodes.ts`) → merge de atoms → `{ chart, summary, evo?, interpretationContext, help? }`.
   - Si `selection.evo && !evo`: `return undefined` (convención core; el
     AxiError se traduce en el command).
   - Docstring de cabecera al estilo de `evolutionary-reading.ts` (single source,
     ADR-0012).

## Criterios de aceptación

- `bun run check:docs` vuelve a verde (árbol + superficie al target).
- Sin imports fuera de `core/` y `caelus` (SPEC §2): `NatalRequest`, `Ephemeris`,
  `ResolvedBirth`, `BirthStatus`, `ChartRequestOptions` desde `./types`.

## Answer

- `src/core/reading.ts` creado: `computeReading(request, ephemeris, selection?)`
  función pura + tipos `AstrologicalReading`/`BirthEcho`/`ChartOutputSelection`
  movidos. Canon `mean_node` limpiado una vez y alimentando `project()` y
  `computeEvolutionaryReading()` por igual; `undefined` (no throw) cuando
  `selection.evo` y faltan pluto/eje nodal; `help` rellenado en la publicación;
  merge de atoms en el ensamblado. `check:docs` en verde.