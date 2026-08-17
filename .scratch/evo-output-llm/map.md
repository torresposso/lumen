# Evo Output para LLM — mapa

Reorganización y completitud del bloque `evo` de `chart natal --evo` para que el
agente LLM interprete con hechos completos y sin malentendidos (Erik 1981-01-26 00:51).

## Decisiones-so-far

- S1: redondear lon/signDeg del bloque `evo` a 4 dp en la frontera TOON (`buildEvo`).
- S6: `evo.ppp.separation` (2 dp) + `evo.ppp.reason` solo si inactive.
- S5: `generateEvoAtoms` (core puro) fusionado a `interpretationContext` con `--evo`.
- S7: `evo.method` con disclosure factual de criterios/orbes.
- S8: `evo.counts` { plutoAspects, nodeAspects, skippedSteps, eclipses }.
- S4: `--bodies` es aditivo (solo extra bodies); guard de CALCULATION_ERROR = red de seguridad.
- Navegación: llaves planas + orden canónico; no se reintroduce la palabra "soul".
- Doc-first: `01-docs-target` bloquea a los tickets de código.

## Hijos

- [x] `01-docs-target`
- [x] `02-evo-precision`
- [x] `03-ppp-separation-reason`
- [x] `04-atoms-evo`
- [x] `05-counts-method`
- [x] `06-tests`
- [x] `07-audit`