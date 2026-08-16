---
id: 03-profile-command
title: 'lumen profile add|list|show|remove — comando nuevo (client sigue vivo)'
status: resolved
blockers: [02]
---

**Objetivo**: `src/commands/profile.ts` con `add|list|show|remove`, registrado
en `cli.ts` AL LADO de `client` (ambos viven durante este ticket; la muerte de
`client` es el ticket 04). El intake de nacimiento (geocode + fallback offline)
se extrae a un módulo compartido para no duplicarlo.

## Tareas

1. Extraer de `client.ts` a `src/commands/intake.ts`: `NatalIntake`,
   `requestFromProfile`, `takeProfileArg` y la definición de `CliContext`
   (ahora con `profiles: ProfileStore`). `client.ts` importa desde ahí
   (retrocompat en vivo).
2. `src/commands/profile.ts`: `add <id> --when … --place …` (misma gramática
   que `client add`; resuelve nacimiento; persiste vía ProfileStore), `list`
   (id + provenance + session de consultas — espeja `lumen client list` de
   hoy), `show <id>` (expone nacimiento; único comando que lo hace, como hoy),
   `remove <id>` idempotente. Ayuda inline por subcomando; flags desconocidos →
   "Unknown flag"; sin subcomando → usage.
3. Absorber el `profileCommand` huérfano de `client.ts:818` (el renombrador
   `clients`→`profiles`) en el nuevo comando; borrar ese export al tocarlo.
4. Appear en `src/cli.ts` registry (`profile: profileCommand`) y en el
   `topLevelHelp` ("profile  Gestión de perfiles locales").
5. Tests: `tests/commands/profile.test.ts` por conversión de
   `tests/commands/client.test.ts` (misma cobertura, superficie `profile`, keys
   de salida `profiles`); los tests viejos de `client` siguen pasando intactos
   mientras vive.

## Criterios de aceptación

- `lumen profile add erick --when … --place …` persiste y `lumen profile list`
  lo muestra; `lumen soul erick` (vía client) sigue igual de bien porque el
  store de datos es el mismo.
- `bun test` / `typecheck` / `check` en verde; `lumen profile` sin subcomando →
  usage; `lumen client` todavía funciona (no muere aún).

## Comments

- Spec: `.scratch/persistence/spec.md` (Q1/Q5/Q6/Q7).
- Bloqueado por 02 (store); necesita 02 para `add`.
- CERRADO 2026-08-16 (commit 64fff45): intake→`src/commands/intake.ts` (seam único zod),
  `profile` add|list|show|remove sobre SQLite con `persistence` opcional en CliContext;
  huérfano absorbido, cli.ts registra ambos. `add` rechaza flags de opciones de carta (Q7).
  Retrollamada al 04: `CliContext.profiles` todavía es JSON (client vivo) y `requestFromProfile`
  sigue leyendo options de perfil — el default `parseRequested({},∅)` se exportó como
  `defaultChartOptions()` en intake para el flip del 04.