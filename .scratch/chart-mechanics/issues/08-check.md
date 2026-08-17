---
id: 08-check
type: task
status: resolved
blockers: [07-tests]
---

**¿Sirve a mi Nodo Norte?** Sí — cerrar con verdes mecánicos deja la feature
entregable y segura para el agente.

## Objetivo

Que toda la cadena de calidad pase.

## Tareas

1. `bun run check:docs` → paridad docs ↔ código OK.
2. `bun test` → verde con conteo recalibrado.
3. `bun run check` → biome y docs verdes.
4. Re-auditar AXI (TOON, help, errores, Home) contra la superficie nueva.

## Criterios de aceptación

- Todo verde.
- SPEC §6 actualizado con conteo real.

## Answer
- `bun run check` (biome + check:docs), `bun test` y `bun run typecheck` verdes.
