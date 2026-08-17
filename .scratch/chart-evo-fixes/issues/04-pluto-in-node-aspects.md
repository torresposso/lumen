---
id: 04-pluto-in-node-aspects
type: task
status: resolved
blockers: [01-docs-fixes]
---

**¿Sirve a mi Nodo Norte?** Sí — la relación Plutón–Nodos es central en la
mecánica evolutiva; hoy se pierde del output (ni `nodeAspects` ni
`pluto.aspects` la muestran).

## Objetivo

Incluir a Plutón en los aspectos nodales sin contaminar `skippedSteps`.

## Cambios

1. En `src/core/nodes.ts`, quitar `bodyId === "pluto"` del filtro de
   `computeNodeAspects()`. Mantener el filtro en `computeSkippedSteps()`.
2. Ajustar `computeNodalReading` para que ambos nodos incluyan contactos de Plutón.
3. Documentar en `CONTEXT.md`: Plutón participa en `nodeAspects`; los
   `skippedSteps` siguen excluyéndolo por doctrina.
4. Tests:
   - Para Erik: `north.aspects` incluye `pluto quintile` orb 1.4399,
     `stress: nonstressful`.
   - `south.aspects` no gana contacto para esta carta.
   - `skippedSteps` sigue sin `pluto`.

## Criterios de aceptación

- `evo.nodalAxis.north.aspects` contiene el contacto Plutón–Nodo Norte.
- Ningún skipped step de Plutón.

## Answer
- Plutón incluido en node aspects; sigue excluido de skipped steps.
