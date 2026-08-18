# Spec — Lumen v2

> Entregable del esfuerzo wayfinder `.scratch/lumen-v2/` — **destino alcanzado, 2026-08-18**.
> Las 5 decisiones están cerradas (ver `map.md` → Decisions so far). Este documento es el **hand-off** para un esfuerzo de implementación: no requiere tomar más decisiones.

## 1. Producto

lumen v2 es un **CLI AXI** (consumido principalmente por un agente de IA) de gestión de **perfiles de nacimiento**. El humano conversa con un agente y le da la ciudad + país + fecha/hora local de nacimiento; el agente resuelve lat/lon y offset UTC y llama a lumen; lumen valida, calcula el Julian Day y persiste. lumen nunca resuelve hechos del mundo: es la interfaz determinista.

**Pivot (fuera de alcance, no vuelve):** toda la astrología (chart, evo, journey, karma, draconic, projection…), geocoding, resolución de timezone, migración de datos v1 (`~/.config/lumen/`), config store, comandos no-profile.

## 2. Modelo de datos

```
Profile {
  id: UUID            // auto-generado por lumen, único y opaco
  name?: string       // opcional, descriptivo, sin unicidad ni lookup
  city: string        // requerido, legible (p. ej. "Madrid, Spain")
  birth: {
    local: { year, month, day, hour, minute }   // hora local, sin segundos
    offsetMinutes: number                       // entero, −840..+840
    lat: number                                 // −90..90
    lon: number                                 // −180..180
    jdUt: number                                // derivado: Meeus ch. 7
  }
}
```

Sin `status` / `zone` / `dst` (no hay resolución de timezone).

## 3. Contrato CLI

```
lumen profile add --when "YYYY-MM-DDTHH:MM" --offset ±N --at "lat,lon" --city "<lugar legible>" [--name <slug>]
lumen profile list
lumen profile get <uuid>
lumen profile rm  <uuid>
```

Reglas:

- `add` **deduplica por nacimiento**: si ya existe un profile con el mismo `jdUt + lat + lon`, devuelve el existente (el `name`/`city` del segundo `add` se descartan — el nacimiento es la identidad).
- `get`/`rm` por **UUID únicamente** (sin lookup por nombre ni city).
- Validación (la regla violada se cita en el error): offset −840..+840; año 1800–2100; mes 1–12; día válido por aritmética pura (bisiesto gregoriano); hora 0–23; minuto 0–59; lat −90..90; lon −180..180.
- Errores AXI: `VALIDATION_ERROR` (input), `NOT_FOUND` (get/rm de UUID inexistente), `PROFILE_ERROR` (fallo de store, p. ej. cwd no escribible).
- Mensajes en **inglés**.
- Salida **solo TOON** (sin `--json`): política centralizada en `toon.ts` — `jdUt` a 6 decimales, `lat`/`lon` a 4, `offset` entero; display only (la DB conserva precisión completa). El agente parsea el texto.

## 4. Cálculo JD

Fórmula **Meeus, *Astronomical Algorithms* ch. 7** en aritmética pura (sin dependencias, sin tabla DST) — bit-idéntica a la `julianDay` de caelus (verificado: 14/14 vectores, 0 discrepancias en 1800–2100). Referencia: `research/calculo-jd-y-deps.md` (rama `research/calculo-jd-y-deps`).

## 5. Persistencia

- Archivo: `./lumen.db` en el cwd (per-project); override por env `LUMEN_DB` (ruta completa del archivo).
- Creación **lazy**: solo `add` crea el archivo (y su directorio); `list`/`get`/`rm` sobre DB inexistente responden vacío/not-found sin crear archivos.
- Permisos **0600**, journal de **rollback** (sin WAL), migraciones por **PRAGMA user_version** (empieza en 1).

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id             TEXT    PRIMARY KEY,
  name           TEXT,
  city           TEXT    NOT NULL,
  local_year     INTEGER NOT NULL,
  local_month    INTEGER NOT NULL,
  local_day      INTEGER NOT NULL,
  local_hour     INTEGER NOT NULL,
  local_minute   INTEGER NOT NULL,
  offset_minutes INTEGER NOT NULL,
  lat            REAL    NOT NULL,
  lon            REAL    NOT NULL,
  jd_ut          REAL    NOT NULL,
  created_at     TEXT    NOT NULL,
  updated_at     TEXT    NOT NULL
);

-- Dedupe por nacimiento: un profile por (jdUt, lat, lon)
CREATE UNIQUE INDEX idx_profiles_birth ON profiles (jd_ut, lat, lon);
```

Notas: cwd no escribible → AxiError `PROFILE_ERROR` con sugerencia; añadir `lumen.db` a `.gitignore`.

## 6. Dependencias

```jsonc
"dependencies":     { "axi-sdk-js": "^0.1.10" },
"devDependencies":  { "@biomejs/biome": "^2.5.8", "@types/bun": "latest" },
"peerDependencies": { "typescript": "^5" }
```

Eliminados: `caelus`, `caelus-birth`, `zod`, `luxon` (esta última solo transitoria de caelus-birth).

## 7. Tests (`bun test`)

- `tests/jd.test.ts` — los 14 vectores de referencia (research 02); validaciones límite (Feb 30, hora 24, offset ±841, año 1799/2101, lat ±90.1, lon ±180.1); round-trip offset.
- `tests/profile-store.test.ts` — CRUD; dedupe (ON CONFLICT devuelve el existente); creación lazy (`list` no crea archivo, `add` sí); permisos 0600; override `LUMEN_DB`; migración `user_version`.
- `tests/cli.test.ts` — contrato de entrada (cada flag + combinaciones); errores AXI; salida TOON (redondeos aplicados); `add` imprime el UUID; dedupe visible desde CLI.

## 8. Estructura de código sugerida

```
bin/lumen.ts                 # entry (executable)
src/cli.ts                   # runAxiCli + registro de comandos
src/commands/profile.ts      # add / list / get / rm
src/core/jd.ts               # Meeus + validación del contrato
src/core/types.ts            # Profile, BirthInput, etc.
src/core/toon.ts             # política de formato (precisiones)
src/storage/profile-store.ts # ProfileStore v2 (bun:sqlite)
tests/jd.test.ts
tests/profile-store.test.ts
tests/cli.test.ts
```

(Layout orientativo — las decisiones de implementación son libres dentro de este esquema.)

## 9. Tareas de implementación (hand-off)

1. **Podar el árbol v1**: eliminar `src/commands/{chart,intake,journey,karma,setup}.ts`, `src/core/{charts,reading,evo-criteria,evolutionary-reading,journey,karma,projection,soul,classical,nodes,phases,birth}.ts`, `src/adapters/`, `src/storage/config.ts` y sus tests.
2. **`package.json`**: dependencias finales (§6) + `bun install`.
3. **Implementar por capas**: `types` → `jd` → `toon` → `profile-store` → `commands/profile` → `cli` → `bin`.
4. **Tests por suite** (§7).
5. **`.gitignore`**: añadir `lumen.db`.
6. **`README.md`**: reescribir a lumen v2.
