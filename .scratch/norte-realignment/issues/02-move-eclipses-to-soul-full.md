---
id: T2-move-eclipses-to-soul-full
title: Mover eclipses prenatales de `classical chart --eclipses` a `soul --full`
status: done
blockers: []
---

**¿Sirve a mi Nodo Norte?** Sí — los eclipses prenatales son eventos nodales:
marcan la intención evolutiva del Alma para la vida actual. Pertenecen al
reading evolutivo (`soul`), no a la sala de máquinas.

## Objetivo

`computePrenatalEclipses` (hoy en `src/core/classical.ts`, invocada por
`classical chart --eclipses`) debe entregarse desde `soul --full`, que ya
entrega las cadenas de dispositores completas. `classical` queda sin
`--eclipses`.

## Tareas

1. `src/core/`: ubicar `computePrenatalEclipses` en el módulo core evolutivo
   correspondiente (o mantenerlo en classical.ts y consumirlo desde el comando
   `soul` si respeta las fronteras de SPEC §2 — decisión de implementación
   local, sin mover archivos "para ordenar").
2. `src/commands/soul.ts`: incluir los eclipses prenatales en la salida de
   `--full` con el campo `prenatalEclipses`.
3. `src/commands/classical.ts` y `src/commands/client.ts`: remover el flag
   `--eclipses` del intake (se rechaza como desconocido, exit 2).
4. Tests: mover/adaptar los tests de eclipses al reading evolutivo.

## Criterios de aceptación

- `lumen soul <client> --full` incluye los eclipses prenatales (solar y lunar).
- `lumen classical chart --eclipses` se rechaza con flag desconocido (exit 2).
- `bun test` en verde; typecheck y biome limpios.

## Answer

- `EclipseInfo`, `EclipsesResult` y `computePrenatalEclipses` movidos de `src/core/classical.ts` a `src/core/nodes.ts` (eventos nodales del Alma; fronteras de SPEC §2 respetadas, sin tocar la cuenta de módulos puros).
- `soul --full` incluye `evolutionaryMechanics.prenatalEclipses` (solar y lunar); sin `--full` el campo se omite.
- `--eclipses` eliminado del intake (`optionsSchema`, suggestions, flagSpec, usage, parseRequested), de `ChartRequestOptions`, de `AstrologicalEngine.compute` y de `client-store.ts` (se rechaza como flag desconocido, exit 2).
- Tests: `tests/core/prenatal-eclipses.test.ts` re-apuntado a `core/nodes`; nuevo assert de `prenatalEclipses` en el test de `soul --full`; tests de classical/engine sin eclipses.
- Verificado en vivo: `soul --full` muestra `prenatalEclipses` con `solar` y `lunar`; `classical chart --eclipses` → "Unknown flag --eclipses".
- Usage de `soul` actualizado ("Con --full: cadenas de dispositores, aspectos finos y eclipses prenatales").
