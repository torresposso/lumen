---
id: 03-intake
type: task
status: resolved
blockers: [02-docs-evo]
---

**¿Sirve a mi Nodo Norte?** Sí — la gramática nueva debe funcionar tal como la
va a usar el agente: `chart natal <profile> --evo` en una llamada.

## Objetivo

Agregar `--evo` al intake y arreglar el parser posicional para que el flag
funcione con perfil e inline.

## Tareas

1. Agregar `evo` a `chartFlagSpec` booleans (`src/commands/intake.ts`).
2. Crear `ChartOutputSelection { evo: boolean }` (en `src/commands/chart.ts` o `src/core/types.ts`, sin extender `NatalRequest`).
3. Refactorizar `resolveRequest()` para separar flags de salida (`--evo`) antes de validar perfil posicional/`--profile` (hoy `src/commands/chart.ts:391-413` lo rechaza).
4. Mantener que `chart draconic` pueda recibir `--evo` y rechazarlo con error estructurado (ver `04-draconic-reject`).
5. Actualizar `chartUsage`/`chartNatalUsage` con `--evo`.
6. Asegurar que durante la transición `soul` no acepte `--evo` en silencio (spec de flags por comando o borrado conjunto).

## Criterios de aceptación

- `lumen chart natal <profile> --evo` funciona.
- `lumen chart natal --when ... --place ... --evo` funciona.
- `lumen chart draconic --evo` da `VALIDATION_ERROR` con help.
- `soul` (mientras exista) no traga `--evo` en silencio.

## Answer
- `evo` añadido a `chartFlagSpec`; `parseEvoFlag` en `chart.ts`; `chart natal <profile> --evo` funciona.
