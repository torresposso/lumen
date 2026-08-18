# 05 — v2 test strategy

Type: grilling
Status: resolved
Blocked by: 03, 04

## Question

What do the lumen v2 tests cover?

- Suites: JD calculation (vectors and boundary cases), profile-store (CRUD, migration, permissions), CLI (input contract, errors, TOON output).
- Which v1 tests are rewritten (profile-store.test.ts, natal-intake, birth-resolver…) and which are discarded.

## Answer

Resolved (2026-08-18).

**Framework**: `bun test` (same as v1).

**Three suites**:
- `tests/jd.test.ts` — pure calculation: 14 reference vectors from research 02; validation boundary cases (Feb 30, hour 24, offset ±841, year 1799/2101, lat ±90.1, lon ±180.1); offset round-trip.
- `tests/profile-store.test.ts` — CRUD (add/list/get/rm); birth dedupe (ON CONFLICT returns the existing profile); lazy creation (`list` does not create the file, `add` does); 0600 permissions; `LUMEN_DB` override; `user_version` migration.
- `tests/cli.test.ts` — input contract (each flag + combinations); AXI errors (VALIDATION_ERROR citing the rule, NOT_FOUND, PROFILE_ERROR); TOON output (rounding applied); `add` prints the UUID; dedupe visible from the CLI.

**v1 mapping**: rewritten by pattern: `profile-store.test.ts` and `cli.test.ts`; discarded: `natal-intake`, `birth-resolver`, `geocode`, `config` and the whole astrology tree.