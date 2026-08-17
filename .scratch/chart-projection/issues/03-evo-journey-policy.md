---
id: 03-evo-journey-policy
type: task
status: open
blockers: [01-docs-chart-projection]
---

**¿Sirve a mi Nodo Norte?** Sí — un solo estándar de precisión en la salida hace
que el agente (yo) lea grados comparables sin ruido entre comandos.

## Objetivo

Los números publicados del bloque `evo` y de `journey progressed` cruzan la misma
política nombrada.

## Cambios

1. `src/core/evolutionary-reading.ts`: importar `roundToon`/`roundSeparation` de
   `../core/projection`; reemplazar los `round(...)` inline de `lon`/`signDeg`
   (pluto/ppp/north/south) y la separación 2dp; `rulerPlacement.signDeg`
   de north/south pasa a `roundToon` (enrutado explícito — el valor ya era 4dp
   en core, byte-idéntico). Eliminar el alias `roundPrecision as round` si queda
   sin usos.
2. `src/commands/journey.ts`: en `progressed`, `lon`/`signDeg` de cada cuerpo
   progresado pasan por `roundToon` (antes crudos). `sign` se conserva del core.
3. Las arrays de `aspects`/`orb` no cambian: los orbes ya están redondeados a 4dp
   en los matchers de core (soul/nodes).

## Criterios de aceptación

- `bun test` en verde, incluyendo `tests/core/evolutionary-reading.test.ts` con el
  nuevo pin de `rulerPlacement.signDeg` (4dp) y `tests/commands/timing.test.ts` /
  `tests/commands/journey.test.ts` con pins 4dp en progressed.

## Answer
<!-- pending -->