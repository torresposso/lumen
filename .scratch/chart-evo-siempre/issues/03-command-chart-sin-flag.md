---
id: 03-command-chart-sin-flag
type: task
status: ready-for-agent
blockers: [01]
---

**¿Sirve a mi Nodo Norte?** Sí — quitar `--evo` de raíz elimina la gramática que
enseña un contrato bifurcado: la carta y su lectura van juntas, siempre.

## Objetivo

Eliminar el flag `--evo` de la superficie: `parseEvoFlag`, el rechazo de
draconic y todas las menciones del flag en usages/help (src/) y docs vivos
(gramática, no registro histórico).

## Tareas

1. `src/commands/chart.ts`:
   - Borrar `parseEvoFlag` y el rechazo `mode === "draconic" && evo`.
   - `computeReading(request, ephemeris)` sin argumentos extra; sin cast.
   - Reescribir `chartUsage`, `chartNatalUsage`, `chartDraconicUsage` al target:
     natal siempre con la mecánica; draconic en el canon (sin «experimento»,
     sin «rechaza --evo», sin «insumo base»).
2. `src/commands/intake.ts`: quitar `"evo"` de `chartFlagSpec.boolean` y la
   línea `--evo` de `chartUsage`; `--evo` queda como flag desconocido.
3. `src/cli.ts`: línea de `chart` en `topLevelHelp` y el hint del Home sin
   `--evo`, draconic en el canon.
4. `src/commands/profile.ts`: hint de `chart natal <id>` sin `--evo`.
5. `src/core/classical.ts`: comentario de `generateEvoAtoms` sin `(--evo)`.
6. Tests:
   - `tests/commands/chart.test.ts`: el test del bloque evolutivo se ejecuta
     **sin** `--evo`; borrar `--evo=false` y el «sin --evo sin átomos evolutivos»;
     `--evo`/`--evo=true` entran a la lista de flags rechazados; borrar el test
     de rechazo draconic específico.
   - `tests/commands/profile.test.ts`: quitar `--evo` de las dos llamadas a
     chart y renombrar el test.
   - `tests/cli/natal-intake.test.ts`: añadir `--evo` a los flags rechazados.

## Criterios de aceptación

- Sin `--evo` en src/ ni en la gramática viva de docs (solo registro histórico
  en ADR-0007/ADR-0014 y el spec de la cadena).
- `chart natal` y `chart draconic` entregan el contado sin flags de mecánica.
- `bun test` + `bun run typecheck` + `bun run check` en verde.

## Comments

- 2026-08-17: abierto por pi; desbloqueado al resolver 01.