---
id: 02-profile-store-sqlite
title: storage — tabla `profiles` en lumen.db (bun:sqlite)
status: resolved
blockers: [01]
---

**Objetivo**: nueva capa `src/storage/profile-store.ts` sobre `bun:sqlite`.
Es la base de la feature; nada más se mueve hasta que exista y pase tests.

## Tareas

1. `ProfileStore` (bun:sqlite): archivo `~/.config/lumen/lumen.db` (homologar
   `LUMEN_PROFILES_DIR` si está seteado, igual que client-store hoy). Tras
   abrir/crear, `chmodSync` a `0600` del `.db`. Diario: default de SQLite basta
   para un CLI mono-usuario; sin WAL (evitar `-wal`/`-shm` heredando el umask).
2. Migración: `PRAGMA user_version` — versión 1 crea la tabla; abrir sin versión
   = crear; versiones superiores → error claro (`PROFILE_ERROR` AXI).
3. Schema `profiles` (columnas del spec: `id` TEXT PK, `jd_ut` REAL, `lat` REAL,
   `lon` REAL, `local_*` INTEGER (year..minute), `zone` TEXT, `offset_minutes`
   INTEGER, `dst` INTEGER, `status` TEXT con `CHECK` en ok|ambiguous|nonexistent,
   `created_at`/`updated_at` TEXT ISO).
4. API (misma forma que ClientStore hoy para que los consumidores roten sin
   dolor): `list()` → sumario privacidad-sseguro (id, status, updatedAt, sin
   fechas), `get(id)`, `add(id, birth)` (idempotente: mantiene `createdAt`,
   refresca `updatedAt`), `remove(id)` idempotente (false si no existe).
5. Tests `tests/storage/profile-store.test.ts`: en un dir temporal — defaults,
   add/get/list/remove, idempotencia de add y remove, `0600` tras crear, reabrir
   con `user_version=1` de un archivo manual, `user_version` desconocido → error
   AXI. `bun test` / `typecheck` / `check` en verde.

## Criterios de aceptación

- Store CRUD completo y testeado; lectura de un `.db` con version mayor da
  `PROFILE_ERROR` con pista ("Run `lumen profile list` again").
- Ningún consumidor roto: `client` actual sigue pasando tests (el nuevo store
  no se usa en la superficie hasta el ticket 03/04).
- Implementar contra los docs ya anticipados en el ticket 01.

## Comments

- Spec: `.scratch/persistence/spec.md` (Q8 — bun:sqlite verificado como única
  opción compatible con binario single-file).