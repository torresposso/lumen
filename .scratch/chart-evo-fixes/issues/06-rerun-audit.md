---
id: 06-rerun-audit
type: task
status: resolved
blockers: [02-fix-pluto-phase, 03-midpoint-near-anti, 04-pluto-in-node-aspects, 05-evo-precision]
---

**¿Sirve a mi Nodo Norte?** Sí — cerrar con el audit rerun garantiza que la
carta y su mecánica vuelven a ser congruentes antes de usarlas con la familia.

## Objetivo

Re-ejecutar el audit completo con los datos de Erik y cerrar la remediación.

## Tareas

1. Recalcular `chart natal` con y sin `--evo` para Erik 1981-01-26 00:51.
2. Verificar identidad base ↔ base+evo.
3. Verificar F1–F5 contra `.scratch/chart-evo-fixes/spec.md`.
4. Actualizar `.scratch/chart-mechanics/audit.md` a estado resuelto.
5. Recalibrar SPEC §6.1 con el conteo real de tests.
6. `bun run check:docs && bun test && bun run check`.

## Criterios de aceptación

- Audit sin hallazgos abiertos.
- Todo verde.
- Feature `chart-evo-fixes` `resolved`.

## Answer
- Re-verificado con Erik; audit resuelto; SPEC recalibrado a 162/516; todo verde.
