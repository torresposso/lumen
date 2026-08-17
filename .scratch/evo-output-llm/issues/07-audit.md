---
id: 07-audit
type: task
status: resolved
blockers: [06-tests]
---

**¿Sirve a mi Nodo Norte?** Sí — cerrar con el audit re-corrido garantiza que la
carta de Erik sigue siendo correcta tras reorganizar el output.

## Objetivo

Re-ejecutar el audit con los datos de Erik, verificar el target y cerrar la feature.

## Cambios

1. Correr `chart natal` con los datos de Erik + `--evo` y verificar el contrato
   del spec (precisiones, separation, counts, method, átomos).
2. Verificar que los invariantes astrológicos del audit (PPP, midpoints, fases
   applying, quintile de Plutón en north, fase Disseminating, eclipses) se
   mantienen.
3. Marcar `resolved` todos los tickets y cerrar el mapa.

## Criterios de aceptación

- Output de Erik coincide con `.scratch/evo-output-llm/spec.md`.
- `bun test`, `bun run typecheck`, `bun run check` verdes.

## Answer
- Audit re-corrido con Erik (output en `/tmp/opencode/audit-evo-output-llm.txt`):
  - Precisiones: pluto.lon 204.3457, north.lon 130.9058, south.lon 310.9058.
  - `separation: 73.44`; `counts = {5, 16, 1, 2}`; `method` presente.
  - `atoms[98]` (79 base + 19 evo) con los del spec.
  - Invariantes astrológicos intactos: fase Disseminating, midpoint Virgo 17°38'
    (H10), antiMidpoint Pisces 17°38' (H4), pluto quintile en north
    (1.4399), eclipses annular/penumbral, los 5 pluto aspects applying.
  - Regresiones: `chart draconic --evo` → VALIDATION_ERROR; `--evo=false` sin bloque evo.
- Todos los tickets resolved; mapa cerrado; spec a "Implementado".