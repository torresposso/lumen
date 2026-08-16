---
id: T3-recalibrate-tests-and-criteria
title: Recalibrar conteo de tests y criterios de aceptación (SPEC §6)
status: done
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

## Answer

- Conteo real post-remoción: **183 tests, 604 expect** (incluye 3 tests negativos de flags removidos, agregados en review) — actualizado en SPEC §6.1.
- Auditoría AXI sobre la superficie nueva: Home content-first (agenda + clientes + `bin:`/`description:`), `-v` fast-path → `0.1.0`, error estructurado en `lumen synastry` (mensaje + code + help), `--help` por comando con flags. Re-auditoría registrada en `.scratch/axi-audit-report.md`. Sin violaciones abiertas.
- README/DOMAIN/CONTEXT verificados sin superficie removida (classical = chart|draconic; eclipses solo en `soul --full`).
- Review de ejes (Standards/Spec): `computePrenatalEclipses` ahora solo se calcula con `--full`; comment obsoleto en `classical.ts` corregido; `toSynastryChart` renombrado a `toOverlayChart` (su único consumidor es `computeKarma`).
