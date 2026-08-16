---
id: 01-chart-natal-draconic
title: `chart` top-level (natal | draconic); `classical` y el modo evolutionary mueren
status: ready-for-agent
blockers: []
---

**¿Sirve a mi Nodo Norte?** Sí — leer mi propia carta y su proyección draconic
es el primer verbo del norte ("leo mi propia carta"); hoy se entierra bajo una
etiqueta de escuela (`classical`) que el propio ADR-0004 prohíbe como puerta de
código, y el modo evolutionary duplica a `soul`.

## Objetivo

Superficie = SPEC §3 actualizada: `chart natal|draconic` (geometría pura),
`classical` fuera, lectura evolutiva solo en `soul`. Corte limpio: sin aliases,
sin retrocompatibilidad.

## Tareas

1. `src/commands/classical.ts` → `src/commands/chart.ts`: despacho top-level
   `natal|draconic`; sin subcomando o `--help` → usage; subcomando desconocido
   → `VALIDATION_ERROR`; flags sin subcomando → error de subcomando requerido.
   Client posicional (`lumen chart natal erick`) + `--profile` + flags inline.
   Motor: eliminar la sección `evolutionary` del output (Projection pierde el
   campo), la nota de help de "four natural evolutionary conditions", el
   modo `evolutionary` y `applyMode` simplificado (solo draconic).
2. `src/commands/client.ts`: quitar `--draconic`/`--evolutionary` del flag
   spec (mecanismo `exclude` en `deriveFlagSpec`), de `optionsSuggestions` y
   del usage; los campos zod y `ChartRequestOptions` se quedan (P2 diferido).
3. `src/cli.ts`: `chart` reemplaza a `classical` (registro + topLevelHelp).
4. Tests: fusionar/reescribir `tests/commands/chart.test.ts` (natal, draconic,
   sin sección evolutionary, flags removidos rechazados como unknown junto a
   `--lots`/`--stars`/`--eclipses`, usage↔flagSpec); borrar
   `tests/commands/classical.test.ts`; actualizar `tests/commands/profile.test.ts`
   y `tests/cli/natal-intake.test.ts`.
5. Datos: `lumen client add erick --when "1981-01-26T00:50" --place "Magangué,
   Colombia"` (documentar en el Answer; provisional hasta Q2/P1).
6. SPEC §6.1: recalibrar conteo de tests (ticket de remoción con pregunta del
   norte respondida arriba).

## Criterios de aceptación

- `bun test` en verde (conteo recalibrado en SPEC §6.1), `bun run typecheck` y
  `bun run check` limpios.
- `lumen chart` (sin subcomando) → usage; `lumen chart natal|draconic <client>`
  y con flags inline funcionan; `lumen classical` → error de comando
  desconocido; `--draconic`/`--evolutionary` → "Unknown flag" (exit 2).
- Ninguna salida de chart incluye sección `evolutionary`; la lectura sigue
  entregándose por `lumen soul <id> --full` (tests existentes de soul intactos).
- La superficie resultante es exactamente la de SPEC §3.

## Decisiones diferidas (next session — ver `.scratch/chart-top-level/spec.md`)

Q2 (self vs client), Q3 (familia), P1 (dónde vive el dato del dueño),
P2 (muerte del campo `options.evolutionary` en el schema persistido).