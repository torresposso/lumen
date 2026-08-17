---
id: 02-core-separation
type: task
status: resolved
blockers: [01-docs-criteria]
---

**¿Sirve a mi Nodo Norte?** Sí — la separación que core ya mide para decidir
`ppp.active` debe ser el mismo número publicado; duplicarla con un fallback es
el tipo de drift que enturbia la lectura del agente (D2/D3).

## Objetivo

Core dueño de la medición: `computeSoulReading` devuelve la separación cruda
Plutón–Nodo Verdadero, y la deactivación usa una constante nombrada.

## Cambios

1. `src/core/soul.ts`:
   - `export const PPP_DEACTIVATION_ORB = 10;` (junto a `PLUTO_ASPECTS`).
   - `computeSoulReading`: calcular `plutoNorthNodeSeparation` crudo una sola vez
     (`angularDistance(pluto.lon, northNodeLon)` solo si `northNodeLon !== undefined`);
     `isConjunctNN = plutoNorthNodeSeparation !== undefined && plutoNorthNodeSeparation <= PPP_DEACTIVATION_ORB`
     (reemplaza el literal `<= 10` y deja de descartar la distancia).
   - `SoulPlutoReading` gana `plutoNorthNodeSeparation?: number` y se devuelve en el resultado.
2. `src/core/nodes.ts`:
   - `export const SKIPPED_STEPS_ORB = 5;` y usarlo como default param en
     `computeSkippedSteps` y `computeNodalReading` (reemplaza el literal `orbLimit = 5`).
   - La regla skipped (square al eje nodal) no cambia de semántica.
3. Tests: `tests/core/soul.test.ts` — la separación se expone (presente con NN,
   ausente sin NN, valor = `angularDistance`); el test de deactivación puede
   ascertar la separación (= 2 con NN 232 / Pluto 230).

## Answer
- `soul.ts`: `PPP_DEACTIVATION_ORB = 10` exportada; `computeSoulReading` calcula
  `plutoNorthNodeSeparation` (cruda) una vez, la usa en `isConjunctNN` y la
  devuelve en `SoulPlutoReading`.
- `nodes.ts`: `SKIPPED_STEPS_ORB = 5` exportada; default de `computeSkippedSteps`
  y `computeNodalReading`.
- soul.test.ts: separación expuesta (presente/ausente, valor = angularDistance,
  activo aunque esté lejos sin desactivar). 7 tests / 40 expect verdes.

## Criterios de aceptación

- `bun test` core/soul verde; ningún literal `10`/`5` duplicado en las reglas.
- Sin cambio de contrato de salida todavía (eso es 03/04).