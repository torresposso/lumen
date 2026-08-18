---
id: 05-cierre
type: task
status: resolved
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
- 2026-08-17: resuelto por pi.

## Answer

Cierre de la cadena `chart-evo-siempre`:

1. **Contraos finales**: `bun test` 193 tests / 695 expect (crecimiento:
   suite draconic-evo), typecheck y `bun run check` (biome + check:docs) en
   verde.
2. **SPEC §6.1** recalibrado a los conteos finales.
3. **Gramática**: `--evo` solo en el registro histórico (ADR-0007, ADR-0008,
   ADR-0014) y en los `.scratch/` de cadenas pasadas; tests de flags rechazados
   lo usan explícitamente como caso negativo. Cero menciones en src/ ni en la
   gramática viva de docs.
4. **Smoke**: `lumen chart natal erik` y `lumen chart draconic erik` entregan
   el contrato de `spec.md` sin flags — natal con `evo` y `method` sin marco;
   draconic con el eje fijo (Norte 0° Aries, Sur 180° Libra), mecanica
   recalculada sobre su zodiaco y `method` declarando el marco draconic. Perfil
   `erik` agregado (datos de referencia del spec, 1981-01-26 00:51 Magangué).
5. **Tickets**: 01–05 en `resolved`; map.md con todas las hijas cerradas.

Nota sobre el rojo de la transición: la paridad mecánica que valida
`check:docs` (lista de comandos de SPEC §3 y árbol src/) nunca cambió en la
cadena, así que el rojo esperado no se materializó; el verde de cierre se
verificó igual en este ticket (criterio de ADR-0014 cumplido en efecto, no en
forma).