# Chart reading: el ensamblado de la lectura natal vive en core (ADR-0012)

> **Estado**: Implementado y verificado — review de `/code-review` aplicada y cadena de
> tickets cerrada (185 tests, 665 expect).
> **Origen**: `/improve-codebase-architecture` (candidato 1) — la lectura natal
> (ensamblado completo) seguía viviendo en `src/commands/chart.ts` dentro de la
> clase `AstrologicalEngine.compute()`, con el canon true-node partido en dos
> mecanismos (DROPPED_NODE para `project()`; filtros NOD en `soul.ts` + fallback
> `true_node ?? mean_node` en `nodes.ts` para el bloque evo).

## Decisiones

1. **Módulo profundo `src/core/reading.ts`** es dueño del ensamblado de la
   lectura natal: `computeReading(request, ephemeris, selection?)` +
   los tipos `AstrologicalReading`/`BirthEcho`/`ChartOutputSelection`, que se
   **mueven** desde `commands/chart.ts`. Es función pura (sin clase), `Ephemeris`
   por parámetro como los demás `computeX` de core (ADR-0010/0011); core nunca
   instancia el adapter.
2. **Publicación autocontenida**: `computeReading` rellena `help` (los tres
   strings actuales, byte-idénticos, incl. `help: undefined` cuando está vacío).
   Precedente: ADR-0009 (core emite `method`/`formatted`/`description`).
3. **`T | undefined`, no throw**: si `selection.evo` y falta pluto/eje nodal,
   `computeReading` devuelve `undefined` (convención de core, ADR-0010) y
   `chartCommand` traduce con el `AxiError` actual intacto.
4. **Canon true-node limpiado una vez**: `computeReading` borra `mean_node` de
   los bodies y pasa **el mismo set** a `project()` y a
   `computeEvolutionaryReading()`. Byte-idéntico (el guard garantiza `true_node`;
   `NON_PLANETARY_IDS` sigue filtrando aspects). El fallback `true_node ?? mean_node`
   de `nodes.ts` queda inerte en el camino natal (sigue vivo para karma/journey,
   que usan charts propios) — se documenta en un comentario.
5. **`chart.ts` queda como AXI glue**: parsing, usage routing, `resolveRequest`,
   `parseEvoFlag`, `applyMode`, `chartCommand` e instanciación del adapter.
   Deja de exportar tipos (cero consumidores externos: solo `chartCommand` —
   `src/cli.ts`, `tests/commands/chart.test.ts`, `tests/commands/profile.test.ts`).
6. **Merge de atoms en core**: `interpretationContext.atoms.push(...evo.atoms)`
   se mueve dentro del ensamblado (locality con los generadores).
   `generateFactAtoms`/`FactAtomsInput` quedan intactos (el tighten es del
   candidato 2, no ratificado).

## Contrato tras la feature

- `src/core/reading.ts` existe y está en el árbol de DOMAIN.md/domain.md (parity verde).
- `chartCommand` es la única exportación de `commands/chart.ts` que los
  consumidores usan; `AstrologicalEngine`/`AstrologicalReading`/`BirthEcho`/
  `ChartOutputSelection` y los re-exports de classical ya no existen ahí.
- `computeReading(request, ephemeris)` sin `--evo` produce la carta base y
  `computeReading(request, ephemeris, { evo: true })` agrega el bloque `evo`
  (o `undefined` si faltan pluto/eje nodal — el command lanza el `AxiError`).
- Salida publicada byte-idéntica para toda la superficie: help, summary, evo,
  draconic, interpretationContext, interpretación del `undefined`.

## Criterios de cierre

- `bun run check` (biome + check:docs), `bun run typecheck` y `bun test` en verde.
- `tests/core/astrological-engine.test.ts` y `tests/core/output-projection.test.ts`
  portados a `computeReading` con los mismos `toBe`/`toFixed` (byte-pins intactos),
  más un pin del `undefined` (evo con carta sin pluto) y un pin del canon único
  (evo `true` con `mean_node` nunca publicado).
- SPEC §6.1 recalibrado con el conteo real de tests.