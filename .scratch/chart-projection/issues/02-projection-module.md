---
id: 02-projection-module
type: task
status: open
blockers: [01-docs-chart-projection]
---

**¿Sirve a mi Nodo Norte?** Sí — proyectar en un solo módulo hace el contrato
navegable para el agente y elimina la fricción de mantener tres versiones de la
misma política.

## Objetivo

Crear `src/core/projection.ts` y dejar `commands/chart.ts` sin proyección propia.

## Cambios

1. `src/core/projection.ts` (nuevo):
   - Política: `TOON_LON_DIGITS(4)/TOON_SPEED_DIGITS(6)/TOON_ORB_DIGITS(4)/TOON_STRENGTH_DIGITS(3)/TOON_SEPARATION_DIGITS(2)`
     + helpers `roundToon/roundSpeed/roundOrb/roundStrength/roundSeparation`.
   - Tipos movidos: `LonProjection`, `AspectProjection`, `Projection`,
     `DraconicBodyProjection`, `DraconicProjection`.
   - Funciones movidas: `projectLon` (reemplaza a `renderLon(number | {lon})`;
     `Chart.cusps` es `number[]` y `angles` son números — la rama `{lon}` muere),
     `projectBodies`, `projectDraconicBodies`, `projectAngles`, `projectDraconic`,
     `project` (+ `ProjectionInput`). `project` llama a
     `computeDeclinationAspects`/`computeChartSignature`/`detectAspectPatterns`
     desde `classical.ts`.
2. `src/commands/chart.ts`: borrar las funciones/tipos de proyección; `compute`
   llama a `project` importado del módulo. Conserva `AstrologicalEngine`,
   `AstrologicalReading`, `BirthEcho`, `ChartOutputSelection`, `DROPPED_NODE`,
   merge de `help` y el `AxiError`. Sin re-exports de los tipos movidos.

## Criterios de aceptación

- `tests/core/output-projection.test.ts`, `tests/core/astrological-engine.test.ts`
  y `tests/commands/chart.test.ts` pasan sin cambios (output byte-idéntico).
- `bun run check:docs` vuelve a verde (árbol + superficie al target).

## Answer
<!-- pending -->