# Chart projection — mapa

Un solo hogar para la proyección de la carta y la política de precisión (4dp/6dp/3dp/2dp),
compartido por `chart`, el bloque `evo` y `journey progressed` (ADR-0011).

## Decisiones-so-far

- Módulo profundo `src/core/projection.ts`: mapping completo (`project`) + política nombrada.
- `chart.ts` conserva el engine y deja de proyectar (sin re-exports de los tipos movidos:
  nadie los importa).
- `journey progressed` y `evo.rulerPlacement.signDeg` se unen a los 4dp.
- Union `renderLon` colapsado a `projectLon(rawLon: number)`.
- Doc-first: `01-docs-chart-projection` bloquea a los tickets de código.

## Hijos

- [ ] `01-docs-chart-projection`
- [ ] `02-projection-module`
- [ ] `03-evo-journey-policy`
- [ ] `04-tests`
- [ ] `05-review`