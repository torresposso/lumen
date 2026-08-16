# ADR-0005: ProfileStore sobre bun:sqlite (lumen.db)

* Status: accepted
* Deciders: Erick, opencode
* Date: 2026-08-16

## El norte

¿Sirve a mi Nodo Norte (Leo, casa 10, conj. MC — aplicar la astrología
evolutiva con otros)? Sí: guardar los seres de la práctica (mi carta y la de
mi familia) para releerlos es la aplicación con otros.

## Contexto

- lumen guardaba personas en un store JSON (`client-store.ts`, `clients.json`)
  con `add(id, request)` — el request mezclaba nacimiento + opciones de carta.
- Q7 (spec persistence): las opciones de carta **no** viven en el perfil; van
  en flags o en la config global.
- Q11: arranque vacío — sin migración de datos legados.
- El guardado es local y contiene fecha/hora/lugar de nacimiento: datos
  personales.

## Decisión

- `ProfileStore` en `src/storage/profile-store.ts`, sobre `bun:sqlite`
  (embebido, síncrono).
- Archivo `~/.config/lumen/lumen.db` (o `$LUMEN_PROFILES_DIR/lumen.db`),
  permisos `0600`, directorio `0700`.
- Migraciones con `PRAGMA user_version` (v1 actual); una db con versión mayor →
  error `PROFILE_ERROR`.
- Sin WAL: journal de rollback por defecto → no quedan `-wal`/`-shm` colgando.
- Entidad: `id` + nacimiento resuelto (`ResolvedBirth` en columnas: `jd_ut`,
  `lat`, `lon`, `local_*`, `zone`, `offset_minutes`, `dst`, `status`) +
  `created_at`/`updated_at`.
- `add(id, birth)`: upsert idempotente (conserva `created_at`, refresca
  `updated_at`).
- `list()` con privacidad AXI: solo `id`, `birthStatus`, `updatedAt` — **cero
  fechas de nacimiento**.
- `get(id)`, `remove(id)` (idempotente).
- Superficie de persona: `profile add|list|show|remove`; `show` es el único
  que expone los datos natales.

## Consecuencias

- Muere el store JSON y `client` como comando: la entidad es `profile`.
- Las opciones de carta no se guardan por perfil: el default vive en
  `config.json` (`src/storage/config.ts`), con precedencia
  **flag > config > schema-default**.
- `soul`/`journey`/`karma`/`chart` leen perfiles vía `requestFromProfile`
  (intake.ts), que aplica los defaults de carta.

## Alternativas

- Seguir en JSON: sin versión de esquema, sin upsert atómico nativo.
- `node:sqlite`: bun:sqlite es síncrono y embebido; suficiente para un CLI
  local.
