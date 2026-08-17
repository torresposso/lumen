---
id: 03-midpoint-near-anti
type: task
status: resolved
blockers: [01-docs-fixes]
---

**¿Sirve a mi Nodo Norte?** Sí — el midpoint Plutón–NN es un punto de
integración clave; publicar el cercano y su opuesto evita elegir un arco
arbitrario y le da al agente el eje completo.

## Objetivo

Publicar `midpoint` (arco corto) y `antiMidpoint` (opuesto).

## Cambios

1. En `src/core/soul.ts`, reemplazar el cálculo actual basado en
   `angularDistanceDirect()` por el midpoint sobre el arco corto y su opuesto.
2. Extender `SoulPlutoReading` con `plutoNorthNodeMidpoint` (cercano) y
   `plutoNorthNodeAntiMidpoint` (opuesto), ambos `formatted`.
3. En `src/commands/chart.ts`, mapear a `EvoOutput.midpoint` y
   `EvoOutput.antiMidpoint`.
4. Tests:
   - core: Plutón 230°, NN 150° → cercano Libra, opuesto Aries.
   - core: Plutón 350°, NN 10° → cercano Aries, opuesto Libra (caso wrap 0°).
   - integración Erik: `Virgo 17°38' (H10)` / `Pisces 17°38' (H4)`.

## Criterios de aceptación

- No queda un solo midpoint lejano como si fuera el único.
- Tests verdes.

## Answer
- `midpoint` cercano + `antiMidpoint`; tests incluyen wrap 0°.
