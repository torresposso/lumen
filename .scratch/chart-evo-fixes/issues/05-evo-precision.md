---
id: 05-evo-precision
type: task
status: resolved
blockers: [01-docs-fixes]
---

**¿Sirve a mi Nodo Norte?** Sí — un bloque `evo` autocontenido permite al
agente auditar y razonar sin cruzar contra `chart.bodies`.

## Objetivo

Agregar `lon` y `signDeg` a `evo.pluto`, `evo.ppp`, `evo.nodalAxis.north` y
`evo.nodalAxis.south`.

## Cambios

1. `src/commands/chart.ts`: extender `EvoOutput`/`EvoNodalPoint` y rellenar
   desde los valores ya calculados por core.
2. Tests de integración:
   - Erik: `evo.pluto.lon = 204.3457`, `signDeg = 24.3457`.
   - Erik: `evo.ppp.lon = 24.3457`, `signDeg = 24.3457`.
   - Erik: `north.lon = 130.9058`, `south.lon = 310.9058`.

## Criterios de aceptación

- El bloque `evo` no depende de `chart` para recuperar grados exactos.

## Answer
- `lon`/`signDeg` añadidos a pluto/ppp/north/south.
