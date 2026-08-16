---
id: T1-remove-classical-synastry-lots-stars
title: Remover synastry clásica, alias `lumen synastry`, `--lots` y `--stars` de la superficie
status: done
blockers: []
---

**¿Sirve a mi Nodo Norte?** Sí — quitar lo helenístico/técnico (no canónico)
reduce el enredo y me deja practicar la doctrina evolutiva sin distracciones;
la sinastría evolutiva sigue viva en `karma pair`.

## Objetivo

Alinear la superficie del CLI con SPEC §3: `classical` = `chart` + `draconic`
nada más. Corte limpio: sin aliases, sin deprecación, sin retrocompatibilidad.

## Tareas

1. `src/commands/classical.ts`: remover `synastry` como subcomando, el alias
   retrocompatible `lumen synastry` (`synastryCommand`, `synastryUsage`,
   `synastrySelfUsage`) y el parseo de flags `--lots` / `--stars`.
2. `src/commands/client.ts`: remover `lots` / `stars` de `optionsSchema`,
   de los mensajes de validación, del usage (`--lots`, `--stars`) y del mapeo
   de flags. (Los flags removidos deben rechazarse como desconocidos — no
   aceptarse en silencio; `--help` siempre pasa.)
3. `src/core/types.ts` y `src/core/classical.ts`: remover `lots` / `stars` de
   las opciones y del resultado, y las funciones `computeHermeticLots` /
   `computeFixedStarMatches` si nada más las usa.
4. `src/adapters/ephemeris-gateway.ts`: remover los métodos `lots` /
   `fixedStars` solo si quedan sin consumidores.
5. `src/storage/client-store.ts`: remover las comprobaciones de tipo de
   `eclipses`/`lots`/`stars` solo para `lots` y `stars` (los eclipses se
   mantienen — ver T2).
6. `src/cli.ts`: actualizar la descripción de `classical` en el Home.
7. Tests: actualizar los tests de comandos y core que ejercían synastry
   clásica, lots o stars.

## Criterios de aceptación

- `bun test` en verde; `bun run typecheck` y `bun run check` limpios.
- `lumen classical` solo acepta `chart` y `draconic`; `lumen synastry` ya no
  existe; `--lots` / `--stars` se rechazan con error de flag desconocido
  (exit 2).
- La superficie resultante es exactamente la de SPEC §3.

## Answer

- `lumen synastry`, `classical synastry` y `synastryCommand` eliminados (`src/commands/classical.ts` truncado en la sección synastry).
- `computeSynastry` + tipos de sinastría genérica removidos de `src/core/karma.ts`; `toSynastryChart` se conserva (lo usa `computeKarma`).
- `--lots`/`--stars` fuera del intake (`client.ts`), de `ChartRequestOptions`, del seam `Ephemeris` (métodos `lots`/`starLongitude`/`fixedStars`, sin consumidores; `CaelusEphemeris` pierde el campo `data`), de `client-store.ts` y del help de `cli.ts` (classical ahora "(chart, draconic)").
- `computeHermeticLots`, `computeFixedStarMatches`, `computeClassicalProjections` (código muerto) eliminados de `src/core/classical.ts`.
- Tests: borrados `tests/commands/synastry.test.ts` y `tests/core/classical-extensions.test.ts`; `tests/core/synastry.test.ts` reescrito conservando solo `toSynastryChart`; opciones y mocks recalibrados.
- Verificado en vivo: `lumen classical synastry` → "Unknown classical command"; `--lots`/`--stars` → "Unknown flag".
- `docs/agents/domain.md` (árbol) y `docs/spec-*.md` obsoletos actualizados/eliminados.
