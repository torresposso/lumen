---
id: 04-tests
type: task
status: resolved
blockers: [01-docs-reading]
---

**¿Sirve a mi Nodo Norte?** Sí — los pins byte-por-byte protegen el contrato que
mi agente lee: la lectura publicada no cambia con el move.

## Objetivo

Portar los tests del engine a `computeReading` y pinar el nuevo contrato.

## Cambios

1. `tests/core/astrological-engine.test.ts` → `tests/core/reading.test.ts`
   (rename + port):
   - import `{ computeReading }` de `../../src/core/reading`;
     `CaelusEphemeris` de `../../src/adapters/ephemeris-gateway`;
     `NatalRequest` desde `../../src/core/types`.
   - `new AstrologicalEngine()` → `computeReading(request, new CaelusEphemeris())`;
     `new AstrologicalEngine(mockEphemeris)` → `computeReading(request, mockEphemeris)`.
   - Los 6 tests se conservan con los mismos asserts (sun Gemini/house 9, solo
     true node, extra bodies, draconic, mock seam, signature/atoms).
2. `tests/core/output-projection.test.ts`: mismo port (`new AstrologicalEngine(E)`
   → `computeReading(request, E)`; `evoEngine(...).compute(request, { evo: true })`
   → `computeReading(request, evoEngine(...), { evo: true })`).
3. Dos pins nuevos para el contrato del módulo:
   - `computeReading` con carta sin pluto y `{ evo: true }` → `undefined`.
   - Con `{ evo: true }` y chart con `mean_node`, `out.chart.bodies.mean_node`
     sigue `undefined` (canon único; el set limpio alimenta evo).
4. Tests de `tests/commands/*` intactos (superficie igual).

## Criterios de aceptación

- Todos los `toBe`/`toFixed` de los byte-pins originales se conservan.
- `bun test` en verde; recalibrar SPEC §6.1 con el conteo real.

## Answer

- `tests/core/astrological-engine.test.ts` → `tests/core/reading.test.ts` con
  `computeReading` + `CaelusEphemeris`/mock (helper `expectReading` para el
  narrowing, biome prohíbe `!`). `output-projection.test.ts` portado
  (helper `mustRead`), byte-pins intactos. Pins nuevos: `undefined` con
  `--evo` y carta sin pluto; canon único con evo (`mean_node` nunca publicado).
  Suite: 185 tests / 665 expect; SPEC §6.1 recalibrado.