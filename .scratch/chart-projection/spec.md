# Chart projection: un solo hogar para el mapping y la política de precisión (TOON)

> **Estado**: Draft — implementación tras el ticket doc-first `01-docs-chart-projection`.
> **Origen**: `/improve-codebase-architecture` (candidato 2) — la publicación de la carta vivía
> en `src/commands/chart.ts` (~106 LOC) y la política de precisión tenía tres casas
> (chart.ts, evolutionary-reading.ts, journey.ts), con journey emitiendo números crudos.

## Decisiones

1. **Un módulo profundo** `src/core/projection.ts` es dueño de la proyección de la carta:
   `project()` (bodies, draconic, angles, cusps, aspects, meta) + los tipos
   `Projection`/`LonProjection`/`AspectProjection`/`DraconicProjection`/`DraconicBodyProjection`,
   que se **mueven** desde `commands/chart.ts`.
2. **Política de precisión nombrada** en el mismo módulo: constantes
   `TOON_LON_DIGITS(4)/TOON_SPEED_DIGITS(6)/TOON_ORB_DIGITS(4)/TOON_STRENGTH_DIGITS(3)/TOON_SEPARATION_DIGITS(2)`
   y helpers `roundToon/roundSpeed/roundOrb/roundStrength/roundSeparation` delegando en `roundPrecision`.
   Todo número publicado cruza por la misma puerta (ADR-0011); angles y cusps leen
   `TOON_LON_DIGITS` directamente a través de `projectPoint`.
3. **`chart.ts` deja de proyectar**: `AstrologicalEngine.compute` llama a `project()` del módulo;
   conserva `AstrologicalEngine`/`AstrologicalReading`/`BirthEcho`, el borrado de `mean_node`
   (canon nodo verdadero) y el `AxiError` (ADR-0010/ADR-0001).
4. **`evolutionary-reading.ts` y `journey.ts`** usan los helpers de política.
   `evo.*.rulerPlacement.signDeg` se enruta explícitamente por `roundToon`
   (el valor ya era 4dp en core — `nodes.ts` —; el enrutado lo hace explícito, byte-idéntico).
   `journey progressed` adopta 4dp en `lon`/`signDeg` (antes crudo; nada lo pinzaba).
5. **Seam pequeño**: `projectLon(rawLon: number)` reemplaza al union `renderLon(number | {lon})`
   — `Chart.cusps` es `number[]` y `angles` son números (la rama `{lon}` era código muerto).
   `computeDeclinationAspects`/`computeChartSignature`/`detectAspectPatterns` se quedan en
   `classical.ts` y la proyección los **llama** (dependencia core→core).
6. **Salida de la carta base byte-idéntica**: el move no cambia valores; el único
   cambio de bytes es `journey progressed` (a 4dp). `rulerPlacement.signDeg` era
   ya 4dp en core y ahora cruza explícitamente `roundToon` (byte-idéntico).

## Contrato tras la feature

- `src/core/projection.ts` existe y está en el árbol de DOMAIN.md/domain.md (parity verde).
- `commands/chart.ts` sin `projectBodies`/`projectAngles`/`renderLon`/`project`.
- `evo.nodalAxis.north/south.rulerPlacement.signDeg` enrutado por la política (`roundToon`).
- `journey progressed` emite `lon`/`signDeg` a 4dp.
- `tests/core/projection.test.ts` asevera la tabla de política + mapping directo + draconic.

## Criterios de cierre

- `bun run check` (biome + check:docs), `bun run typecheck` y `bun test` en verde.
- `tests/commands/chart.test.ts` y `tests/core/output-projection.test.ts` byte-idénticos
  (mismos `toBe`/`toFixed`).
- Nuevos pins: 4dp en journey (timing/journey) y `rulerPlacement.signDeg`.
- SPEC §6.1 recalibrado con el conteo real de tests.