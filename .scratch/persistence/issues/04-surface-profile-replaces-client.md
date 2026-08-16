---
id: 04-surface-profile-replaces-client
title: 'client muere — soul/chart/karma/journey consumen profiles'
status: ready-for-agent
blockers: [03]
---

**Objetivo**: corte limpio de la superficie y del storage. `lumen client …`
desaparece, `profile` es la única entidad de persona, y **toda** referencia al
store/storage anterior muere (sin retrocompatibilidad, sin archivos legados,
sin fallback). `consultations.json` y el comando `consulta` NO se tocan (mundo
aparte, decidido en Q10).

## Tareas

0. **Muerte del storage viejo**: borrar `src/storage/client-store.ts` completo
   (ClientStore/ProfileStore, `defaultClientsFile`/`defaultProfilesFile`,
   retrocompat). Síntoma de cierre: `rg "client-store|ClientStore|
   ProfileStore|clients.json|profiles.json" src/` → cero resultados.
1. `src/commands/client.ts` muere tras mover sus helpers a `intake.ts` (si
   quedó algo vivo, reubicar a `profile.ts`). Borrar el archivo completo.
2. `src/cli.ts`: registro `client` → fuera, `profile` sola; `topLevelHelp` y
   Help del Home enganchan `profile` (p.ej. 'Run `lumen profile add <id> --when
   "…" --place "…"`'); keys de Home `clients` → `profiles` (agenda de consultas
   intacta).
3. `src/commands/soul.ts` / `chart.ts` / `karma.ts` / `journey.ts`: importar
   helpers de `intake.ts` y resolverse contra `ProfileStore`; sin cambios de
   comportamiento — solo de procedencia. Preservar gramática posicional
   (`lumen soul <profile>`), `--profile` y flags inline.
4. `consultations.json`: nada. `consulta` sigue con su Context y su store.
   (Su key por `clientId` pasa a llamarse "perfil" conceptualmente, sin tocar
   datos ni comandos.)
5. Docs ya al target (ticket 01); aquí solo **recalibrar SPEC §6.1** con el
   conteo final de tests si cambió (los tests viejos de `client-store` muertos,
   los de `profile` nuevos pesan distinto).
6. Tests: `tests/storage/client-store.test.ts` se borra (ticket 02 ya cubre el
   store nuevo); `tests/commands/client.test.ts` → reescrito como
   `profile.test.ts` (todo lo que era `client` ahora prueba `profile`);
   `tests/commands/soul|chart|karma|journey.test.ts` y
   `tests/cli/natal-intake.test.ts` actualizan import/ids sin cambiar asserts
   de salida excepto donde el nombre plano cambia por el nuevo store.
   Recalibrar SPEC §6.1 si el conteo cambia.
7. Verificar en vivo: `lumen client …` → comando desconocido (exit≠0);
   `lumen profile add|list|show|remove` y `lumen soul erick`, `lumen chart
   natal erick` OK; el dir de store no contiene `clients.json`/`profiles.json`.

## Criterios de aceptación

- Superficie final = SPEC §3 (este ticket la fija): 7 comandos, `profile` en
  lugar de `client`.
- Muerte total: cero referencias a `client-store`, `ClientStore`,
  `ProfileStore`, `clients.json` o `profiles.json` en `src/`, `tests/`,
  `DOMAIN.md` y `README.md`.
- `bun test` / `typecheck` / `check` en verde.

## Comments

- Spec: `.scratch/persistence/spec.md` (Q4/Q10/Q11).
- Depende secuencialmente de 03 (convivir sin conflicto hasta el último pasivo).