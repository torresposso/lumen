# 03 — Schema SQLite y archivo de la DB

Type: prototype
Status: resolved
Blocked by: 01, 02

## Question

¿Cómo se ve la DB v2?

- Tabla única `profiles` (id, jd_ut, lat, lon, local_*, offset, …) — columnas vs JSON según 01.
- user_version, journal mode, permisos 0600, path `./lumen.db` en el cwd (decisión de charting).
- Override por env (¿LUMEN_DIR?) y edge cases: cwd no escribible, `.gitignore` de `lumen.db`.
- Prototipo: schema candidato + esbozo de ProfileStore v2 (métodos add/list/get/rm).

## Answer

Resuelto (2026-08-18). Prototipo aprobado.

**Schema v2** (`./lumen.db`, `PRAGMA user_version = 1`):
- Tabla única `profiles` con **columnas planas**: `id` (TEXT PK, UUID auto), `name` (TEXT, nullable — opcional descriptivo), `city` (TEXT NOT NULL — requerido, legible; resuelto en 04), `local_year/month/day/hour/minute` (INTEGER, sin segundos), `offset_minutes` (INTEGER), `lat`/`lon` (REAL), `jd_ut` (REAL), `created_at`/`updated_at` (TEXT).
- **Dedupe por nacimiento en DB**: `CREATE UNIQUE INDEX idx_profiles_birth ON profiles (jd_ut, lat, lon)`; `add` usa `INSERT … ON CONFLICT` para devolver el existente.

**Archivo**:
- Creación **lazy**: solo `add` crea la DB (y su directorio); `list`/`get`/`rm` sobre DB inexistente responden vacío/not-found sin crear archivos.
- Override por env `LUMEN_DB` (ruta completa; default `./lumen.db` en el cwd).
- Convenciones v1: permisos **0600**, **rollback journal** (sin WAL), migraciones por **PRAGMA user_version** desde v1.

**Notas de implementación**: cwd no escribible → AxiError claro (tipo PROFILE_ERROR, con sugerencia); añadir `lumen.db` a `.gitignore` (la DB es per-project).
