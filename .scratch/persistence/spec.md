# Spec: persistence — entidad `profile` sobre SQLite

Decision record + scope de la feature abierta como "la persistencia". Sesión de
grilling 2026-08-16. Nace del reconocimiento de que lumen ya persiste
(`clients.json` / `consultations.json`) pero la entidad de persona merece un
modelo limpio y una base hacia lo que viene (snapshot natal-invariante y
memoria vectorial para agentes, sobre el mismo store).

## Decisiones (cerradas)

- **Q1 — Mínimo de existencia**: `profile` existe solo con nacimiento resuelto
  (fecha, hora y lugar → lat/lon/julian day). No hay perfiles "en blanco".
- **Q2/Q3 — Contenido**: solo datos de nacimiento. El snapshot natal-invariante
  (geometría + lectura JWG) se aplaza: *cuando* llegue, se congela sin sistema
  de casas (longitudes; las casas son función pura de longitudes + sistema
  elegido por consulta) y se versiona con `core_version` (cache regenerable, no
  verdad congelada).
- **Q4 — Una sola entidad de persona**: `profile` reemplaza a `client` en toda
  la superficie. `lumen client …` muere.
- **Q5 — Nombre**: `profile` (patrón de registro de persona; sin colisiones con
  `chart`, `soul`, `journey`, `karma`, `consulta`).
- **Q6 — Creación**: `lumen profile add <id> --when … --place …` resuelve el
  nacimiento (geocode con fallback offline). Sin cálculo pesado por ahora (el
  snapshot está diferido).
- **Q7 — Opciones de carta** (sistema de casas, nodos, cuerpos): NO viven en el
  perfil. Viajan en config global única (`config.json`) o flag por comando; el
  flag gana.
- **Q8 — Almacenamiento**: `bun:sqlite`, `~/.config/lumen/lumen.db`, permisos
  `0600`, tabla `profiles`, migraciones con `PRAGMA user_version=1`. Única
  opción compatible con el binario `bun build --compile` de archivo único
  (verificado: libsql nativo rompe el single-file; su wasm no acepta `file:`).
- **Q10 — Borrado**: `lumen profile remove <id>` limpio e idempotente. El mundo
  de consultas es aparte (su store no se toca, cada lado se borra por su
  cuenta). `consultations.json` permanece intacto.
- **Q11 — Transición**: arranque **vacío**, sin migración. `profiles.json` /
  `clients.json` quedan como archivos muertos.
- **Q12 — Muerte total del storage viejo**: muere `client` y también **toda**
  referencia al store/storage anterior: se borra `src/storage/client-store.ts`
  (ClientStore/ProfileStore, rutas legacy, retrocompatibilidad),
  no se lee `clients.json`/`profiles.json` desde ningún lugar, no hay
  dual-write ni fallback. Tradeo: hoy 0 perfiles reales (el arranque es vacío),
  así que el costo es cero.

## La entidad

```text
profile:
  id: erick                # handle único, sirve a soul/chart/karma/journey
  birth:
    jd_ut, lat, lon        # nacimiento resuelto
    local: { year, month, day, hour, minute }
    zone: string           # IANA tz
    offsetMinutes, dst
    status: ok | ambiguous | nonexistent
  createdAt / updatedAt
```

## Fuera de alcance (futuro, mismo `lumen.db`)

- Snapshot congelado `core_version` (longitudes + lectura JWG; casas derivadas).
- Memoria vectorial / búsqueda semántica para agentes (embeddings + kNN o FTS5).

## Notas abiertas

- El `profileCommand` ya existente en `client.ts:818` (renombra `clients` →
  `profiles`) queda absorbido por la implementación de `profile`; no ha estado
  registrado nunca.
- Los retazos del dominio viejo (P2 del ticket de chart: muerte del campo
  `options.evolutionary` del schema persistido) son irrelevantes aquí: el new
  store no carga el `StoredClient` de JSON.
- **Doc-first institucionalizado**: regla en `docs/agents/issue-tracker.md` y
  `AGENTS.md` + check mecánico `bun run check:docs` (fusionado en
  `bun run check`): SPEC §3 ↔ `cli.ts` y árbol de `DOMAIN.md`/`domain.md` ↔
  `src/`. Tras el ticket 01 queda rojo esperado; verde obligatorio al cerrar 05.

## Blast radius

- `src/storage/profile-store.ts` (nuevo, bun:sqlite) · `src/storage/client-store.ts` (muere)
- `src/commands/profile.ts` (nuevo: add|list|show|remove) · `src/commands/client.ts` (muere tras extraer intake compartido)
- `src/cli.ts` (registro `profile` en lugar de `client`, Home, topLevelHelp)
- `src/commands/soul.ts` / `chart.ts` / `karma.ts` / `journey.ts` (consumen el profile store vía helpers compartidos)
- `src/storage/config.ts` (nuevo: `config.json` con defaults de opciones)
- Tests: `tests/commands/client.test.ts` → `profile.test.ts`, `tests/storage/profile-store.test.ts` (nuevo), `tests/cli/natal-intake.test.ts`, SPEC §6.1
- Docs: `README.md`, `DOMAIN.md`, `SPEC.md`, `CONTEXT.md`, `docs/agents/domain.md`, `docs/spec-evolutionary-module.md`, `docs/adr/0001`, `docs/adr/0004` — al target ANTES de tocar código (ticket 01-docs).