---
id: 01-docs-chart-evo-siempre
type: task
status: ready-for-agent
blockers: []
---

**¿Sirve a mi Nodo Norte?** Sí — documentar primero el target evita que el
agente aprenda un contrato bifurcado (`--evo` opt-in, draconic sin mecánica)
que contradice la práctica: la carta y su lectura van juntas, siempre.

## Objetivo

Reescribir los docs vivos **al target de ADR-0014** antes de tocar código.
El target completo está en `.scratch/chart-evo-siempre/spec.md`.

## Tareas

1. `DOMAIN.md`:
   - §1 árbol: sin cambios de módulos (misma estructura de `src/`).
   - §2-A y líneas de mecánica: `chart natal <profile>` sin `--evo` (siempre
     con bloque `evo`); nueva gramática `chart draconic <profile>` con `evo`
     recalculado sobre el zodíaco draconic; borrar el rechazo a `--evo`;
     draconic deja la lista «fuera de la superficie» y pasa al canon.
   - Átomos de `interpretationContext`: siempre incluyen la mecánica, en el
     marco de cada zodíaco.
   - Ejemplos TOON: `chart natal` y `chart draconic` con bloque `evo` presente.
2. `SPEC.md` §3: misma reescritura de gramática y líneas de mecánica
   («insumo base, con mecánica opt-in `--evo`» → «carta + mecánica siempre»;
   «rechaza `--evo`» → regla del eje nodal fijo y disclosure en `method`).
   §6.1: recalibrar conteos al cierre (anotar que crecen con la suite
   draconic-evo).
3. `CONTEXT.md`:
   - *Draconic chart*: quitar «Outside the evolutionary canon; kept as a
     labeled experiment» → segunda ventana canónica con la mecánica recalculada.
   - *Evo block*: quitar «opt-in» y «Not available on chart draconic».
   - *Astrological reading*: quitar la rama `undefined` → AxiError; devuelve
     siempre la lectura completa.
   - *Chart computation*: agregar draconic-evo a la lista de consumidores.
4. `README.md`: actualizar ejemplos de `chart` (sin `--evo`; draconic con mecánica).
5. `docs/agents/domain.md`: espejo de DOMAIN.md — mismas ediciones.
6. ADRs citados: ADR-0007 queda histórico (no se edita); ADR-0014 es la
   referencia vigente.

## Criterios de aceptación

- `bun run check:docs` queda **rojo a propósito** durante la transición y
  vuelve a verde con el cierre de la cadena (ticket 05).
- Los docs describen exactamente el contrato de `spec.md` (natal + draconic
  siempre con `evo`; sin `--evo` en ninguna gramática viva).
- `grep -rn -- --evo README.md DOMAIN.md SPEC.md CONTEXT.md docs/agents/` solo
  encuentra el registro histórico (ADR citado), nunca gramática vigente.

## Comments

- 2026-08-17: abierto por pi tras grill del capitán; registro en ADR-0014.
  Los tickets de código 02–04 quedan bloqueados por este ticket.
