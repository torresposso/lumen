---
id: 02-evo-precision
type: task
status: resolved
blockers: [01-docs-target]
---

**¿Sirve a mi Nodo Norte?** Sí — un bloque `evo` con la misma precisión que la
carta base permite al agente comparar grados sin ruido de coma flotante.

## Objetivo

Redondear a 4 dp, en `buildEvo` (frontera TOON), `pluto.lon/signDeg`,
`ppp.lon/signDeg` y `nodalAxis.north/south.lon/signDeg`.

## Cambios

1. `src/commands/chart.ts` `buildEvo`: aplicar `round` (roundPrecision) a los
   seis campos; core (`computeSoulReading`/`computeNodalReading`) conserva crudo.
2. Mejorar el mensaje del guard `CALCULATION_ERROR` (S4): `--bodies` es aditivo,
   no excluye cuerpos; el mensaje debe ser honesto.

## Criterios de aceptación

- Erik: `evo.pluto.lon = 204.3457`, `signDeg = 24.3457`,
  `north.lon = 130.9058`, `south.lon = 310.9058` (todos 4 dp).

## Answer
- `buildEvo` redondea `pluto.lon/signDeg`, `ppp.lon/signDeg` y `north/south.lon/signDeg`
  a 4 dp (frontera TOON, core crudo). Erik verificado:
  `204.3457 / 24.3457 / 130.9058 / 310.9058`.
- Guard `CALCULATION_ERROR` con mensaje honesto (—bodies es aditivo).
