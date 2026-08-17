---
id: 04-buildEvo-dedup
type: task
status: resolved
blockers: [03-disclosure]
---

**¿Sirve a mi Nodo Norte?** Sí — cerrar el smell del code-review (counts y atoms
recomputan lo mismo) deja el ensamblado legible para el próximo agente que lo
toque, y el mock ephemeris por fin cubre el branch `ppp.active: false` a nivel
de salida (el win que el candidato prometió).

## Objetivo

Agregar una vez y publicar dos (counts compartidos); mock ephemeris a nivel de
motor para el contracto inactive.

## Cambios

1. `src/commands/chart.ts` `buildEvo`:
   - Construir `counts` una vez ({ plutoAspects, nodeAspects, skippedSteps,
     eclipses }) desde los mismos valores que alimentan `generateEvoAtoms`
     (p. ej. `plutoAspectCount: counts.plutoAspects`), sin cambiar la interfaz de
     `generateEvoAtoms`.
   - `separation` desde `soul.plutoNorthNodeSeparation` (round 2 dp, sin fallback).
2. Tests — `tests/core/output-projection.test.ts` (reusa `createMockEphemeris`,
   con 12 cúspides y overrides de `pluto`/`true_node`):
   - **Inactive**: pluto 230 / true_node 232 → `engine.compute(request, {evo:true})`
     aserta `evo.ppp.active === false`, `separation === 2`, `reason ===
     "pluto conjunct north node (separation 2° <= 10°)"`, atoms contienen
     `ppp_inactive`, `method` empieza con `"orbs PLUTO_ASPECTS:"`.
   - **Active**: pluto 230 / true_node 130 → `active === true`, `reason` ausente,
     `separation === 100`, atoms contienen `ppp_active`.
3. Recalibrar `SPEC.md` §6.1 con el conteo final (`bun test`).

## Answer
- `buildEvo`: `counts` agregado una vez y compartido con el input de
  `generateEvoAtoms` (`plutoAspectCount: counts.plutoAspects`); interfaz de
  `generateEvoAtoms` intacta.
- `output-projection.test.ts`: bloque evo sobre mock ephemeris (12 cúspides,
  pluto 230 + true_node 232) — `ppp.active:false`, `separation: 2`,
  `reason: "pluto conjunct north node (separation 2° <= 10°)"`, atoms
  `ppp_inactive`, `method === describeEvoCriteria()`; y caso activo
  (true_node 130): `active:true`, `separation: 100`, sin `reason`, atoms
  `ppp_active`, consistencia counts↔aspects.
- SPEC §6.1 recalibrado: 174 tests / 601 expect.
- Gate final: `bun test` 174 pass / 601 expect, typecheck y `check` (biome +
  check:docs) verdes. Erik: `ppp.separation = 73.44`, `active: true`, `method`
  derivado, sin `reason`.

## Criterios de aceptación

- `bun test` (nuevo conteo en SPEC §6.1), `bun run typecheck` y `bun run check`
  en verde.
- Erik (verificación manual/automática): `ppp.separation = 73.44`, `active: true`,
  `method` = string derivado D5, sin `reason`.
- Cierre de la feature: `map.md` con todos los hijos `[x]`.