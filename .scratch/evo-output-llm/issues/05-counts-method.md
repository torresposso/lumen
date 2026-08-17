---
id: 05-counts-method
type: task
status: resolved
blockers: [01-docs-target]
---

**¿Sirve a mi Nodo Norte?** Sí — un puente numérico entre `summary` y `evo` y una
nota de criterios evitan que el agente lea dos fuentes de verdad o sobre-interprete
un orbe ancho como un error.

## Objetivo

Agregar `evo.counts` y `evo.method`.

## Cambios

1. `EvoOutput` (src/commands/chart.ts):
   - `counts: { plutoAspects, nodeAspects, skippedSteps, eclipses }`
     (todos números; `eclipses` = solar/lunar presentes, 0–2).
   - `method: string` — una línea factual:
     `"orbs PLUTO_ASPECTS (conj/opos 10°, cuadr/trí 8°, sextil 6°, menores 2-3°); ppp solo aspectos mayores (orbe 5°); skipped = cuadraturas al eje nodal (orbe 5°); ppp inactivo si Plutón conj. Nodo Norte (orbe 10°)"`.
2. Orden de llaves en `buildEvo`: pluto → ppp → midpoint → antiMidpoint →
   nodalAxis → phase → dispositorChains → prenatalEclipses → counts → method.

## Criterios de aceptación

- Erik: `counts = { plutoAspects: 5, nodeAspects: 16, skippedSteps: 1, eclipses: 2 }`.
- `method` siempre presente con el bloque `evo`.

## Answer
- `EvoOutput.counts { plutoAspects, nodeAspects, skippedSteps, eclipses }` y
  `method` (una línea factual). Orden de llaves canónico en `buildEvo`.
- Erik verificado: `counts = {5, 16, 1, 2}`; `method` presente.