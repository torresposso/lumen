---
id: 04-engine
type: task
status: resolved
blockers: [03-intake]
---

**¿Sirve a mi Nodo Norte?** Sí — el motor entrega la mecánica evolutiva completa
junto a la carta, en un solo bloque `evo`, sin duplicar rutas de cálculo.

## Objetivo

`AstrologicalEngine.compute()` acepta la selección de output y genera el bloque `evo` completo cuando `--evo` está activo.

## Tareas

1. Cambiar la firma a `compute(request: NatalRequest, selection?: ChartOutputSelection)`.
2. Reutilizar `computeSoulReading`, `computeNodalReading` y `computeSolLunaPhase` desde el mismo `rawChart` que ya calcula `chart` (eliminar la segunda llamada a `chartAt`).
3. Proyectar el bloque `evo` según el contrato del spec §3.2 (pluto, ppp, midpoint, nodalAxis, phase, dispositorChains, prenatalEclipses).
4. `prenatalEclipses` solo computa cuando `--evo` está activo (ya es parte de `evo`).
5. No cambiar el output base cuando no hay `--evo`.

## Criterios de aceptación

- Sin `--evo`: output idéntico al actual.
- Con `--evo`: bloque `evo` completo presente.
- `--bodies` que excluye `pluto`/`true_node` → `CALCULATION_ERROR` accionable.
- Fase nunca inventa `Balsamic` si Sol/Luna faltan.

## Answer
- `AstrologicalEngine.compute(request, {evo})` añade bloque `evo` completo.
