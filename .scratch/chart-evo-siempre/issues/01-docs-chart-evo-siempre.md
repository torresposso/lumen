---
id: 01-docs-chart-evo-siempre
type: task
status: resolved
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
- 2026-08-17: resuelto por pi (doc-first). Los 5 archivos vivos reescritos al
  target de `spec.md`/ADR-0014. `grep -- --evo README.md DOMAIN.md SPEC.md
  CONTEXT.md docs/agents/` vacío. **Nota sobre check:docs**: la paridad
  estructural (lista de comandos de SPEC §3 ↔ cli.ts y árbol de DOMAIN.md/
  docs/agents/domain.md ↔ src/) no cambia con edits de gramática, así que
  `check:docs` permanece **verde** durante esta transición en lugar de rojo —
  la expectativa «rojo a propósito» de ADR-0014/este ticket no se materializa
  (la superficie validada mecánicamente no se toca en la cadena). El verde
  final de la cadena se verifica igual en el ticket 05.

## Answer

Docs vivos al target de ADR-0014:

1. **DOMAIN.md**: comentarios del árbol (`chart.ts` sin `[--evo]`, `classical.ts`
   con Dracónica canónica); §2-A `chart natal <profile>` siempre con bloque
   `evo` (sin `--evo`, sin rama «sin flag», sin `VALIDATION_ERROR` draconic);
   nueva §A' `chart draconic <profile>` con el `evo` recalculado (NN = 0 por
   construcción, secciones constantes, disclosure en `method`, TOON de ejemplo).
2. **SPEC.md**: §3 — línea `chart` sin `--evo` y draconic en el canon; prosa:
   mecánica siempre presente, átomos siempre en el marco de cada zodíaco, sin
   rechazo a `--evo`, eclipses en `chart natal` y proyectados en `chart draconic`;
   §6.1 anota que los conteos crecen con la suite draconic-evo al cierre.
3. **CONTEXT.md**: *Draconic chart* (segunda ventana canónica), *Evo block*
   (siempre, nunca opt-in, disponible en draconic), *Astrological reading*
   (`computeReading(request, ephemeris)` sin rama `undefined`, siempre lectura
   completa), *Chart computation* (consumidor draconic-evo), *Interpretation
   context* y *Evolutionary reading* en el marco de cada zodíaco.
4. **README.md**: ejemplos `chart natal`/`chart draconic` sin flags de mecánica.
5. **docs/agents/domain.md**: espejo de DOMAIN.md.

Criterios de aceptación: `bun run check` verde (biome 0 issues + check:docs OK);
`grep -- --evo` sin resultados en la gramática viva; los docs describen
exactamente el contrato de `spec.md`. Queda desbloqueado el ticket 02-core.
