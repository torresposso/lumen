---
id: 05-cierre
type: task
status: ready-for-agent
blockers: [02, 03, 04]
---

**¿Sirve a mi Nodo Norte?** Sí — cerrar la cadena devuelve el instrumento a
paridad docs ↔ código en verde, recalibrado, con el contrato de ADR-0014 en
vigor.

## Objetivo

Cierre de la cadena chart-evo-siempre: check verde, conteos de SPEC §6.1
recalibrados a los finales reales y paper trail del cierre.

## Tareas

1. `bun test` completo y `bun run typecheck`: verde; contar tests y expects
   reales y recalibrar **SPEC §6.1** (los conteos crecieron con la suite del
   bloque evo draconic).
2. `bun run check` (biome + check:docs): verde.
3. Gramática: `grep -- --evo` en src/ y docs vivos solo encuentra el registro
   histórico (ADR-0007, ADR-0014, spec.md de la cadena) — nunca gramática
   vigente ni usages.
4. `lumen chart natal erik` y `lumen chart draconic erik` entregan el contrato
   de `spec.md` sin flags.
5. Cerrar los tickets 02–04 y este en `.scratch/chart-evo-siempre/`; actualizar
   `map.md` (decisiones-so-far + hijos resueltos).

## Criterios de aceptación

- `bun run check` verde (el verde de cierre que ADR-0014 condicionaba a este
  ticket, verificable aunque la transición no haya producido rojo mecánico).
- SPEC §6.1 con los conteos finales reales.
- Los 5 tickets de la cadena en `resolved`; map.md al día.

## Comments

- 2026-08-17: abierto por pi; desbloqueado al resolver los tickets 02–04.