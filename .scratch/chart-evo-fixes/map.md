# Chart Evo Fixes — mapa

Remediación del audit de congruencia de `chart natal --evo` (Erik 1981-01-26 00:51).

## Decisiones-so-far

- F1: corregir signo de la condición de fase en `aspectPhase()`.
- F2: publicar `midpoint` cercano + `antiMidpoint`.
- F3: documentar orbes evolutivos; no cambiar el set.
- F4: Plutón entra a `nodeAspects`; sigue fuera de `skippedSteps`.
- F5: `evo` se vuelve autocontenido (`lon` + `signDeg`).
- Doc-first: `01-docs-fixes` bloquea a los tickets de código.

## Hijos

- [x] `01-docs-fixes`
- [x] `02-fix-pluto-phase`
- [x] `03-midpoint-near-anti`
- [x] `04-pluto-in-node-aspects`
- [x] `05-evo-precision`
- [x] `06-rerun-audit`
