---
id: 06-tests
type: task
status: resolved
blockers: [02-evo-precision, 03-ppp-separation-reason, 04-atoms-evo, 05-counts-method]
---

**¿Sirve a mi Nodo Norte?** Sí — los contratos verificables protegen la
interpretación que el agente hará de mi carta y de las de mi familia.

## Objetivo

Contratos de la feature + recalibración de SPEC §6.1.

## Cambios

1. `tests/core/evo-atoms.test.ts`: `generateEvoAtoms` — input completo
   (activo e inactivo), casos vacíos (sin skipped/eclipses), determinismo.
2. `tests/commands/chart.test.ts`: ampliar el test `--evo` —
   - `evo.pluto.lon/signDeg`, `north.lon/signDeg` con 4 dp (`toBe` vs `toBeCloseTo`).
   - `evo.ppp.separation` numérico; `reason` ausente con active.
   - `evo.counts` y `evo.method` presentes.
   - `interpretationContext.atoms` contiene átomos evo (`ppp_sign_*`,
     `pluto_aspects_*`, `skipped_*`).
   - Sin `--evo` los átomos no contienen prefijos evo.
3. `SPEC.md` §6.1: recalibrar conteo de tests/expect.

## Criterios de aceptación

- `bun test`, `bun run typecheck`, `bun run check` en verde.
- SPEC §6.1 con el conteo real.

## Answer
- `tests/core/evo-atoms.test.ts` (4 tests): input completo, multi-word phase,
  ppp inactivo + vacíos, determinismo.
- `tests/commands/chart.test.ts`: precisión 4 dp, separation/reason, counts/method,
  átomos evo presentes con --evo y ausentes sin --evo.
- SPEC §6.1 recalibrado: 167 tests, 560 expect. `bun test`, `typecheck`,
  `check` (con check:docs) en verde.