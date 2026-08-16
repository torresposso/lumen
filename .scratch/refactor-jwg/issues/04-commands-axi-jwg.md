---
id: T4-commands-axi-jwg
title: Implementar comandos CLI AXI (soul, journey, karma, consulta, client, classical, setup)
status: done
blockers: [T2-consultation-store, T3-core-modules-refactor]
---

## Objetivo
Implementar la interfaz de comandos CLI bajo la gramática AXI de JWG, manteniendo compatibilidad con alias (`profile`) y formateando en TOON con pre-agregados y `help[]` accionable.

## Tareas
1. `src/commands/soul.ts` (con salida TOON y help de apertura de consulta).
2. `src/commands/journey.ts` (`progressed` y `stations`).
3. `src/commands/karma.ts` (`pair`).
4. `src/commands/consulta.ts` (`abrir`, `preparar`, `leer`, `confirmar`, `cerrar`).
5. `src/commands/client.ts` (con alias retrocompatible `profileCommand`).
6. `src/commands/classical.ts` (`chart`, `draconic`, `synastry`).
7. `src/commands/setup.ts` (`hooks`).
8. Actualizar `src/cli.ts` (Home con agenda de consultas activas).
9. Actualizar toda la suite de tests de comandos.
