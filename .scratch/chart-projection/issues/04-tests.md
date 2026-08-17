---
id: 04-tests
type: task
status: open
blockers: [02-projection-module, 03-evo-journey-policy]
---

**¿Sirve a mi Nodo Norte?** Sí — la política y el mapping con cobertura directa
prueba que el contrato que el agente lee es estable y deliberado.

## Objetivo

Cobertura directa del módulo de proyección y pins de la adopción de política.

## Cambios

1. `tests/core/projection.test.ts` (nuevo):
   - Tabla de política: constantes y helpers (`roundToon(204.3456783…) = 204.3457`,
     `roundSpeed`, `roundOrb`, `roundStrength`, `roundSeparation`).
   - Mapping directo de `project()`: bodies (lon/signDeg/speed/lat/dist/ra/dec,
     `dist: null`), angles, cusps, aspects, `meta.jdUt`, omisión de bodies
     `undefined`, y proyección draconic vía `toDraconicChart`.
2. `tests/core/evolutionary-reading.test.ts`: fixture de Signo/pluto con
   `signDeg` con 6 decimales; pin `rulerPlacement.signDeg` a 4dp.
3. `tests/commands/timing.test.ts`: pins `toFixed(4)` de `lon`/`signDeg` en
   progressed (adopción de política).
4. SPEC §6.1: recalibrar el conteo de tests con el número real.

## Criterios de aceptación

- `bun test`, `bun run typecheck` y `bun run check` (biome + check:docs) en verde.
- Los pins viejos (output-projection, chart.test) intactos.

## Answer
<!-- pending -->