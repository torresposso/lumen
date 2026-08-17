---
id: 06-delete-soul
type: task
status: resolved
blockers: [04-engine, 05-draconic-reject]
---

**¿Sirve a mi Nodo Norte?** Sí — eliminar `soul` deja una sola ruta para la
mecánica y una superficie más simple, sin duplicación ni ambigüedad para el
agente.

## Objetivo

Borrar el comando `soul` y migrar todo lo que lo referencia.

## Tareas

1. Borrar `src/commands/soul.ts`.
2. Quitar su registro y ayuda de `src/cli.ts` (Home + `topLevelHelp`).
3. Migrar `tests/commands/soul.test.ts` al nuevo `chart natal --evo`.
4. Migrar el test de precedencia de config en `tests/commands/profile.test.ts:135-172` que usa `soulCommand`.
5. Actualizar el help de `src/commands/profile.ts:132` (`lumen soul` → `lumen chart natal ... --evo`).
6. Mantener los core functions (`computeSoulReading`, `computeNodalReading`, `computePrenatalEclipses`, `computeSolLunaPhase`) — solo muere el comando.

## Criterios de aceptación

- `soul` no aparece en superficie, `cli.ts`, help, README/DOMAIN/CONTEXT ni tests.
- No hay imports a `src/commands/soul` en `src/`.

## Answer
- Borrado `src/commands/soul.ts`, `tests/commands/soul.test.ts`; cli/profile/help actualizados; tests migrados.
