---
id: 02-core-reading-no-opcional
type: task
status: resolved
blockers: [01]
---

**¿Sirve a mi Nodo Norte?** Sí — una sola llamada que siempre entrega la carta y
su mecánica elimina la superficie condicional que bifurca el contrato en el
core y en el comando.

## Objetivo

Hacer no-opcional el ensamblado de la lectura (ADR-0014): `computeReading`
siempre devuelve `AstrologicalReading` completa, sin `selection`, sin rama
`undefined`. La invariante «la natal siempre lleva Plutón y el Nodo Verdadero»
se fija en `charts.ts` con assert defensivo.

## Tareas

1. `src/core/reading.ts`:
   - Eliminar `ChartOutputSelection` y el parámetro `selection` de
     `computeReading(request, ephemeris): AstrologicalReading`.
   - `AstrologicalReading.evo` y `.interpretationContext` pasan a ser
     obligatorios (siempre presentes).
   - El bloque evo se ensambla siempre (marco natal; el draconic llega en 04) y
     sus átomos se fusionan siempre.
   - Actualizar el doc-comment del módulo (fuera «optionally», «selection»,
     «undefined branch»).
2. `src/core/charts.ts`: assert defensivo — `chartAt` lanza si `pluto` o
   `true_node` faltan del body map limpio (la invariante la da caelus: el set
   base siempre incluye Sun…Pluto y los nodos; `bodies` solo añade extras).
   Actualizar el doc del módulo.
3. `src/core/evolutionary-reading.ts`: retorno no-opcional
   (`EvolutionaryReading`); la rama `if (!soul || !nodal) return undefined` pasa
   a throw defensivo (precondición: la carta lleva Plutón y el Nodo Verdadero).
   Actualizar comentarios.
4. Tests:
   - `tests/core/reading.test.ts`: sin helpers de `undefined`; el mock custom
     cumple la invariante (añadir `pluto`); el caso «missing pluto → undefined»
     pasa a «violación de la invariante → throw».
   - `tests/core/output-projection.test.ts`: sin `selection`, sin `?.` en
     `evo`/`interpretationContext`.
   - `tests/core/evolutionary-reading.test.ts`: `reading` no-opcional; los dos
     casos missing-input pasan a throw.
   - `tests/commands/chart.test.ts`: «full natal chart» y «draconic» actualizan
     su superficie (evo ya presente).

## Criterios de aceptación

- `computeReading(request, ephemeris): AstrologicalReading` — sin `selection`,
  sin `undefined`, `evo` y `interpretationContext` obligatorios.
- `chartAt` falla (throw) si un seam custom viola la invariante; los mocks de
  test existentes la cumplen.
- `bun test` + `bun run typecheck` en verde.

## Comments

- 2026-08-17: abierto por pi; desbloqueado al resolver 01.
- 2026-08-17: resuelto por pi. `computeReading(request, ephemeris):
  AstrologicalReading` sin `selection` ni `undefined`; `evo` y
  `interpretationContext` obligatorios; `chartAt` asserta la invariante
  (plutón + true node); `computeEvolutionaryReading` total (throw defensivo).
  Se retiraron aquí los 2 tests de la superficie opt-in ya obsoletos por el
  cambio de contrato (`--evo=false` y «sin --evo sin átomos evolutivos»); el
  `--evo=true` se fija como redundante hasta el ticket 03.

## Answer

- `src/core/reading.ts`: eliminado `ChartOutputSelection`; `evolutionReading`
  siempre; sin rama `undefined`; doc-comment del módulo y de la función al
  contrato no-opcional.
- `src/core/charts.ts`: `REQUIRED_DEFAULT_BODIES = ["pluto", "true_node"]` +
  assert defensivo en `chartAt` (violación de un seam custom → throw).
- `src/core/evolutionary-reading.ts`: retorno no-opcional; la rama missing-input
  pasa a throw defensivo.
- `src/commands/chart.ts`: fuera la rama `undefined` → `CALCULATION_ERROR` y el
  cast; `parseEvoFlag`/rechazo draconic se mantienen hasta el ticket 03.
- Tests: reading/output-projection/evolutionary-reading sin helpers de
  `undefined` y con los mocks cumpliendo la invariante; los casos missing-input
  pasan a throw; chart.test actualiza sus dos tests end-to-end (evo siempre).

Estado: `bun test` 188 tests / 668 expect en verde, `bun run typecheck` y
`bun run check` verdes. Desbloqueado el ticket 03.