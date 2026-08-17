# Shared chart computation — mapa

El acceso a cartas se vuelve un módulo profundo en core (`src/core/charts.ts`),
siguiendo la línea ADR-0009 → 0010 → 0011 → 0012 → 0013.

## Decisiones-so-far

- `chartAt(request, jdUt, ephemeris)` en `src/core/charts.ts`; una sola firma
  para natal, progresado y estaciones.
- El módulo aplica `ChartRequestOptions` completas y borra `mean_node`.
- `computeReading` usa `chartAt`; `chartFor` privado desaparece.
- `computeProgressions`/`computeStations`/`computeKarma` reciben `NatalRequest`
  y obtienen sus propias cartas.
- Commands sin `chartAt`; solo AXI glue.

## Hijos

- [x] `01-docs-shared-chart`
- [x] `02-core-charts`
- [x] `03-journey-karma`
