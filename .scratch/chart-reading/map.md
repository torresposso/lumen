# Chart reading — mapa

El ensamblado de la lectura natal se vuelve un módulo profundo en core
(`src/core/reading.ts`), siguiendo la línea ADR-0009 → 0010 → 0011 → 0012.

## Decisiones-so-far

- Módulo profundo `src/core/reading.ts`: `computeReading(request, ephemeris, selection?)`
  función pura + tipos `AstrologicalReading`/`BirthEcho`/`ChartOutputSelection`
  movidos desde `commands/chart.ts` (la clase `AstrologicalEngine` se disuelve).
- `help` lo rellena `computeReading` (publicación autocontenida, byte-idéntico,
  `help: undefined` si vacío). Precedente ADR-0009.
- `T | undefined` para evo faltante; el `AxiError` queda en `chartCommand` (mensaje actual intacto).
- Canon true-node limpiado **una vez** en `computeReading`; el mismo set alimenta
  `project()` y `computeEvolutionaryReading()` (byte-idéntico; fallback de
  `nodes.ts` inerte en el camino natal, documentado).
- Merge de `interpretationContext.atoms` en core; `generateFactAtoms`/`FactAtomsInput` intactos.
- `chart.ts` sin exports de tipos (cero consumidores externos); conserva parsing + glue.
- Doc-first: `01-docs-reading` bloquea a los tickets de código.

## Hijos

- [x] `01-docs-reading`
- [x] `02-reading-module`
- [x] `03-command-thin`
- [x] `04-tests`
- [x] `05-review`