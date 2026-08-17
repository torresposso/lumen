---
id: 03-ppp-separation-reason
type: task
status: resolved
blockers: [01-docs-target]
---

**¿Sirve a mi Nodo Norte?** Sí — el agente necesita saber *por qué* el PPP está
activo o inactivo (hecho factual, no lectura) para no inventar una causa.

## Objetivo

Publicar `evo.ppp.separation` y `evo.ppp.reason`.

## Cambios

1. `EvoOutput.ppp` (src/commands/chart.ts): `separation?: number` (separación
   angular Plutón–Nodo Norte, redondeada a 2 dp, calculada con
   `angularDistance`); `reason?: string` solo cuando `active: false` con
   `"pluto conjunct north node (<=10°)"`.

## Criterios de aceptación

- Erik: `evo.ppp.separation = 73.44`; `reason` ausente (active).
- Test unitario core/soul ya cubre `description`; el contrato de salida se
  verifica en `06-tests`.

## Answer
- `EvoOutput.ppp.separation?: number` (angularDistance Plutón–NN, 2 dp) y
  `reason?: string` solo con `active: false` ("pluto conjunct north node (<=10°)").
- Erik: `separation: 73.44`, `reason` ausente (active).
