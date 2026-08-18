# 05 — Estrategia de tests v2

Type: grilling
Status: resolved
Blocked by: 03, 04

## Question

¿Qué cubren los tests de lumen v2?

- Suites: cálculo JD (vectores y casos límite), profile-store (CRUD, migración, permisos), CLI (contrato de entrada, errores, salida TOON).
- Qué tests v1 se reescriben (profile-store.test.ts, natal-intake, birth-resolver…) y cuáles se descartan.

## Answer

Resuelto (2026-08-18).

**Framework**: `bun test` (mismo que v1).

**Tres suites**:
- `tests/jd.test.ts` — cálculo puro: 14 vectores de referencia del research 02; casos límite de validación (Feb 30, hora 24, offset ±841, año 1799/2101, lat ±90.1, lon ±180.1); round-trip offset.
- `tests/profile-store.test.ts` — CRUD (add/list/get/rm); dedupe por nacimiento (ON CONFLICT devuelve el existente); creación lazy (`list` no crea archivo, `add` sí); permisos 0600; override `LUMEN_DB`; migración `user_version`.
- `tests/cli.test.ts` — contrato de entrada (cada flag + combinaciones); errores AXI (VALIDATION_ERROR citando la regla, NOT_FOUND, PROFILE_ERROR); salida TOON (redondeos aplicados); `add` imprime el UUID; dedupe visible desde CLI.

**Mapeo v1**: se reescriben por patrón `profile-store.test.ts` y `cli.test.ts`; se descartan `natal-intake`, `birth-resolver`, `geocode`, `config` y todo el árbol astrológico.
