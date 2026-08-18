# 03 — SQLite schema and DB file

Type: prototype
Status: resolved
Blocked by: 01, 02

## Question

What does the v2 DB look like?

- Single `profiles` table (id, jd_ut, lat, lon, local_*, offset, …) — columns vs JSON per 01.
- user_version, journal mode, 0600 permissions, `./lumen.db` in the cwd (charting decision).
- Env override (LUMEN_DIR?) and edge cases: unwritable cwd, `.gitignore` for `lumen.db`.
- Prototype: candidate schema + a ProfileStore v2 sketch (add/list/get/rm).

## Answer

Resolved (2026-08-18). Prototype approved.

**Schema v2** (`./lumen.db`, `PRAGMA user_version = 1`):
- Single `profiles` table with **flat columns**: `id` (TEXT PK, auto UUID), `name` (TEXT, nullable — optional descriptive), `city` (TEXT NOT NULL — required, human-readable; resolved in 04), `local_year/month/day/hour/minute` (INTEGER, no seconds), `offset_minutes` (INTEGER), `lat`/`lon` (REAL), `jd_ut` (REAL), `created_at`/`updated_at` (TEXT).
- **Birth dedupe in the DB**: `CREATE UNIQUE INDEX idx_profiles_birth ON profiles (jd_ut, lat, lon)`; `add` uses `INSERT … ON CONFLICT` to return the existing profile.

**File**:
- **Lazy creation**: only `add` creates the DB (and its directory); `list`/`get`/`rm` against a missing DB respond empty/not-found without creating files.
- Env override `LUMEN_DB` (full path; default `./lumen.db` in the cwd).
- v1 conventions: **0600** permissions, **rollback journal** (no WAL), migrations via **PRAGMA user_version** from v1.

**Implementation notes**: unwritable cwd → clear AxiError (`PROFILE_ERROR`, with a suggestion); add `lumen.db` to `.gitignore` (per-project data).