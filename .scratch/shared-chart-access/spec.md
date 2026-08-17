# Shared chart computation: acceso a cartas en core (ADR-0013)

> **Estado**: implementado y verificado — check, typecheck y 187 tests/672 expect en verde.
> **Origen**: `/improve-codebase-architecture` candidato 1 — journey/karma hacían
> `chartAt` a mano en los commands, re-copiaban `ResolvedBirth`, omitían opciones
> de carta y duplicaban el canon true-node.

## Decisiones

1. **`src/core/charts.ts`** es el módulo puro que calcula cartas desde un
   `NatalRequest`: `chartAt(request, jdUt, ephemeris)` aplica las
   `ChartRequestOptions` completas y deja **solo** el `true_node` (canon del
   Nodo Verdadero, sin fallback a `mean_node`).
2. **Firma única**: `chartAt(request, jdUt, ephemeris): Chart` sirve para la
   carta natal (`jdUt = request.birth.jdUt`), cartas progresadas y cartas de
   estaciones. No expone proyección TOON (eso sigue en `projection.ts`,
   ADR-0011).
3. **`computeReading`** se refactoriza para usar `charts.chartAt`; desaparece su
   `chartFor` privado.
4. **Firmas core deepen**:
   - `computeProgressions(request, targetJd, targetDateStr, ephemeris, bodyIds?, aspectOrb?)`
   - `computeStations(request, bodyId, ephemeris, window?, limit?)`
   - `computeKarma(idA, requestA, idB, requestB, ephemeris, orb?)`
5. **Commands** quedan como AXI glue: parsing, llamada a core, salida TOON.
6. **Proceso**: doc-first con ADR-0013; los docs se actualizan antes del código.

## Contrato tras la feature

- `src/core/charts.ts` existe y está en el árbol de DOMAIN.md/domain.md.
- `computeReading`, `computeProgressions`, `computeStations` y `computeKarma`
  obtienen sus cartas a través del mismo módulo.
- Ningún command hace `chartAt` directamente.
- El canon true-node vive en un solo sitio.

## Criterios de cierre

- `bun run check`, `bun run typecheck`, `bun test` en verde.
- Tests de `charts.ts` con fake `Ephemeris`: opciones completas y canon.
- Tests de journey/karma core actualizados a las nuevas firmas.
