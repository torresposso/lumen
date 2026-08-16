---
id: T3-recalibrate-tests-and-criteria
title: Recalibrar conteo de tests y criterios de aceptación (SPEC §6)
status: ready-for-agent
blockers: [T1-remove-classical-synastry-lots-stars, T2-move-eclipses-to-soul-full]
---

**¿Sirve a mi Nodo Norte?** Sí — cierra el realineamiento dejando los criterios
de aceptación con números reales, no con el conteo viejo (≥ 195) que
desactualizan T1 y T2.

## Objetivo

Actualizar SPEC §6.1 con el conteo real de tests post-remoción, y verificar
que la auditoría AXI (SPEC §4) siga sin violaciones sobre la superficie
resultante.

## Tareas

1. Correr `bun test` y registrar el conteo real.
2. Actualizar SPEC §6.1 con ese número.
3. Re-correr la auditoría AXI (`.scratch/axi-audit-report.md` como referencia)
   contra la superficie nueva: TOON, errores, `--help`, Home, fast-path.
4. Verificar que README/DOMAIN/CONTEXT no mencionen superficie removida
   (synastry clásica, lots, stars, `classical chart --eclipses`).

## Criterios de aceptación

- SPEC §6.1 dice el conteo real y `bun test` pasa con ese conteo.
- Auditoría AXI sin violaciones abiertas sobre la superficie de SPEC §3.
