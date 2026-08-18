# Research 02 — Julian Day con aritmética pura y árbol de dependencias

Ticket: `.scratch/lumen-v2/issues/02-calculo-jd-y-deps.md`
Branch: `research/calculo-jd-y-deps`
Fecha: 2026-08-18
Método: verificación por ejecución (`bun`) de las fórmulas candidatas contra valores JD de referencia conocidos y contra la implementación `julianDay` de caelus instalada en `node_modules` (fuente primaria del repo).

---

## Recomendación (resumen)

1. **Fórmula:** algoritmo del **capítulo 7 de Meeus, "Astronomical Algorithms" (2.ª ed., 1998)** — *"Julian Day"* — aplicado sobre el día UT fraccionario derivado de `hora local + offset`:

   ```
   utDay = day + (hour + minute/60 + second/3600 − offsetMinutes/60) / 24
   si month ≤ 2: y = year − 1, m = month + 12   (si no: y = year, m = month)
   A = floor(y / 100)
   B = 2 − A + floor(A / 4)
   JD = floor(365.25 × (y + 4716)) + floor(30.6001 × (m + 1)) + utDay + B − 1524.5
   ```

   Es **exactamente la aritmética que ya usa caelus** (`julianDay` en `node_modules/caelus/dist/src/core.js`, líneas 43-53): lumen v2 calcula el *mismo* `jdUt` que v1 para el mismo instante UT, sin caelus-birth. Es numéricamente equivalente a **Fliegel–Van Flandern (1968, CACM 11(10):657)** en todo el rango verificado (bit-por-bit en 1800–2100). Se elige Meeus porque es la fuente canónica astronómica, es la que caelus usa (continuidad verificable contra caelus en tests), y la implementación es directamente auditable contra el libro.

2. **Dependencias finales:** eliminar `caelus`, `caelus-birth` y `zod` (este último a confirmar tras el ticket 01). Quedan `axi-sdk-js` (dep runtime) + `@types/bun`, `@biomejs/biome`, `typescript` (dev/peer).

3. **Verificación:** 14/14 vectores de referencia PASAN para Meeus y F&VF; 0 discrepancias contra `julianDay` de caelus en 1800–2100 (3 muestras/mes); round-trip local+offset→UT idéntico a caelus (0 fallos).

---

## 1. Fórmula recomendada y por qué

### Candidatas evaluadas

| Fórmula | Fuente | Veredicto |
|---|---|---|
| **Meeus ch. 7** (365.25/30.6001/1524.5) | *Astronomical Algorithms*, 2.ª ed., 1998, cap. 7 | **RECOMENDADA** |
| Fliegel–Van Flandern (153m+2 / 365y / 32045) | CACM 11(10):657, 1968 | Equivalente; no aporta nada en JS (float64) |
| `julianDay` de caelus | `node_modules/caelus/dist/src/core.js` | Es Meeus ch. 7, implementado tal cual |

### Por qué Meeus ch. 7

- **Es lo que caelus ya hace.** `caelus-birth` delega todo el cálculo a `julianDay(year, month, day, hour, minute, second)` de caelus ([`node_modules/caelus-birth/dist/src/index.js`](node_modules/caelus-birth/dist/src/index.js), `toJdUt` → `julianDay`), y esa función es Meeus ch. 7 verbatim ([`node_modules/caelus/dist/src/core.js`](node_modules/caelus/dist/src/core.js), líneas 43-53). lumen v2, al reemplazar la resolución de zona por un offset directo, produce **jdUt numéricamente idénticos** a v1: los tests de regresión pueden comparar contra caelus.
- **Equivalente a F&VF, pero con mejor procedencia.** Verificado bit-por-bit (Δ = 0) contra F&VF en los 14 vectores y en 3.096 muestras 1800–2100. F&VF es una fórmula de enteros pensada para C/ensamblador; en JS float64 no hay diferencia práctica. La fuente canónica astronómica es Meeus.
- **Rango y precisión seguros.** Para 1800–2100, `365.25×(y+4716)` ≤ ~2.49×10⁶, y `30.6001×(m+1)` ≤ 428.4: ambos son exactamente representables en float64, el `floor` es seguro (Δ = 0 vs caelus en todo el rango). El input en minutos y la salida jdUt float64 no acumulan error apreciable (precisión ~10⁻⁶ día = 0.09 s por representación de 2.4×10⁶).

### Calendario proléptico (qué hace la fórmula antes de 1582)

- La fórmula aplica las reglas gregorianas de bisiesto a **todas** las fechas (el término `B` depende solo del siglo, no de la fecha): es **Gregoriano proléptico**.
- Antes del 15-10-1582 el calendario histórico era juliano, así que una fecha juliana histórica mapea a un JD distinto. Ejemplo verificado: **1582-10-04 (juliano) = 1582-10-14 (gregoriano proléptico) = JD 2299159.5**, mientras que 1582-10-04 (gregoriano proléptico) = JD 2299149.5. La serie 1582-10-05…14 no existe en el calendario gregoriano real (el salto de 10 días del reforma).
- **lumen no lo necesita:** las fechas de nacimiento realistas son 1800–2100, enteramente gregorianas. Ver §3 para la regla de validación recomendada.

### Día fraccionario

```
UT (horas) = hour + minute/60 + second/3600 − offsetMinutes/60
utDay      = day + UT/24          # parte entera = día gregoriano, fracción = hora UT del día
```

JD 0 = mediodía del 1-1-4713 a.C. (juliano proléptico); el `−1524.5` de la fórmula coloca la medianoche en JD terminado en `.5` (p. ej. 2000-01-01 00:00 UT = 2451544.5). Los offsets positivos (este) restan horas a la hora local; los negativos (oeste) suman.

---

## 2. Vectores de prueba verificados (14/14 PASS)

Ejecutado con `bun` (v1.3.14) — ambas fórmulas (Meeus y F&VF) en cada vector; tolerancia 1e-9. Además: **0 discrepancias** contra `julianDay` de caelus en 1800–2100 (3 muestras/mes) y **0 fallos** en round-trip local+offset → campos UT → caelus.

| # | Entrada (local y/m/d h:m:s, offset min) | JD esperado | Computado | Resultado |
|---|---|---|---|---|
| 1 | 2000-01-01 12:00:00, offset 0 | 2451545.0 | 2451545.0 | PASS |
| 2 | 1900-01-01 00:00:00, offset 0 | 2415020.5 | 2415020.5 | PASS |
| 3 | 1999-01-01 00:00:00, offset 0 | 2451179.5 | 2451179.5 | PASS |
| 4 | 1957-10-04 19:26:00, offset 0 (Meeus 7.a, Sputnik) | 2436116.31 (impreso; exacto 2436116.30972) | 2436116.3097222224 | PASS |
| 5 | 1987-01-27 00:00:00, offset 0 (Meeus 7.b) | 2446822.5 | 2446822.5 | PASS |
| 6 | 1582-10-04 00:00:00, offset 0 (greg. proléptico) | 2299149.5 | 2299149.5 | PASS |
| 7 | 1582-10-14 00:00:00, offset 0 (= juliano 1582-10-04) | 2299159.5 | 2299159.5 | PASS |
| 8 | 1582-10-15 00:00:00, offset 0 (greg. proléptico) | 2299160.5 | 2299160.5 | PASS |
| 9 | **Offset negativo:** 2000-01-01 07:00:00, offset **−300** (= 12:00 UT) | 2451545.0 | 2451545.0 | PASS |
| 10 | **Offset positivo cruzando medianoche:** 2000-01-01 00:00:00, offset **+570** (= 1999-12-31 14:30 UT) | 2451544.1041666665 | 2451544.1041666665 | PASS |
| 11 | **Fracción no entera:** 2000-01-01 00:00:00, offset **+330** (= 1999-12-31 18:30 UT) | 2451544.2708333335 | 2451544.2708333335 | PASS |
| 12 | **Segundos:** 2000-01-01 12:00:01, offset 0 | 2451545.0000115741 | 2451545.000011574 | PASS |
| 13 | **Offset límite:** 2000-01-01 12:00:00, offset **+840** (= 1999-12-31 22:00 UT) | 2451544.4166666665 | 2451544.4166666665 | PASS |
| 14 | **Offset límite:** 2000-01-01 12:00:00, offset **−840** (= 2000-01-02 02:00 UT) | 2451545.5833333335 | 2451545.5833333335 | PASS |

Cross-checks adicionales (ejecutados, todos PASS):
- Meeus vs F&VF vs `julianDay` de caelus, 1800–2100, días {1,15,28} × 12 meses × 301 años = **3.096 muestras**: 0 mismatches, Δ máx = 0.
- Round-trip: `jdMeeus(local, offset)` == `julianDay(caelus, camposUT)` con `camposUT = local − offset/60/24` para offsets {−840, −300, 0, 330, 570, 840} × 3 fechas: 0 fallos.

Script de verificación: `/tmp/opencode/jd-verify.ts` (fuera del repo; reproducible con `bun /tmp/opencode/jd-verify.ts`).

---

## 3. Reglas de validación recomendadas para el contrato de entrada

Hechos verificados que motivan las reglas:
- La fórmula es *garbage-in-garbage-out*: **30 de febrero de 2000 produce el mismo JD que 1 de marzo de 2000** (2451604.5), y **29 de febrero de 1900 (no bisiesto) produce el mismo JD que 1 de marzo de 1900** (2415079.5). Las fechas inválidas deben rechazarse antes del cálculo.
- `hour = 24` se colapsa silenciosamente al día siguiente 00:00 (JD idéntico): la cota superior de hora debe ser 23.
- El chequeo actual de días-por-mes en `src/commands/intake.ts` (línea 53) usa `new Date(Date.UTC(year, month, 0))`, y **Date.UTC mapea los años 0–99 al siglo XX** (verificado: `Date.UTC(50,…)` → 1950). Una validación de bisiesto por aritmética pura evita ese footgun.

Reglas concretas recomendadas:

| Campo | Regla | Error sugerido |
|---|---|---|
| `offsetMinutes` | entero, **−840 ≤ offset ≤ +840** (rango real máximo de la historia: UTC−12 a UTC+14; coincide con el ±14 h que ya acota caelus-birth en su comentario de `toUT`) | `--offset must be between -840 and +840 minutes` |
| `year` | entero en **[1800, 2100]** (dominio realista de fechas de nacimiento; mantiene el calendario gregoriano sin ambigüedad proléptica) | `--year out of supported range 1800-2100` |
| `month` | entero 1–12 | `--month must be 1-12` |
| `day` | entero 1–`daysInMonth(year, month)` con regla gregoriana de bisiesto (`y%4==0 && (y%100!=0 \|\| y%400==0)`), aritmética pura | `--day invalid for that month` |
| `hour` | entero 0–23 (no 24) | `--hour must be 0-23` |
| `minute` | entero 0–59 | `--minute must be 0-59` |
| `second` | 0–59 si el contrato lo incluye (hoy el schema v1 no tiene segundos) | — |
| `lat` / `lon` | −90…90 / −180…180 | `--lat must be -90 to 90` |

Notas:
- **Leap seconds: ignorar, documentado.** El JD cuenta días continuos; los segundos intercalares (27 desde 1972, el último en 2016-12-31) son inserciones discretas que hacen a UTC no uniforme frente a TAI/UT1. El input de lumen llega en **minutos** (ni siquiera puede expresar un segundo intercalar), el offset es en minutos enteros, y la discrepancia de ≤1 s es ~1.2×10⁻⁵ día, irrelevante para un jdUt astronómico/astrológico. La fórmula es la estándar para "UT" continuo; no hay nada que hacer.
- **DST (ambigüedad/inexistencia):** desaparecen por construcción. Con un offset explícito no hay resolución de zona ni transiciones; los campos `status` (ok/ambiguous/nonexistent), `zone` y `dst` de `ResolvedBirth` (v1, originados en `UTResult` de caelus-birth) dejan de tener sentido — decide el ticket 01 si sobreviven en el modelo de datos. Recomendación: no persisten; se deriva `jdUt` y se guarda el offset input.

---

## 4. Árbol de dependencias

### Mapa de imports actual (grep en `src/`)

| Paquete | Dónde se importa hoy | ¿En el corte v2 (profile add/list/get/rm)? |
|---|---|---|
| `axi-sdk-js` | `cli.ts` (`runAxiCli`), `commands/*` (`AxiCliCommand`, `AxiError`), `storage/profile-store.ts` (`AxiError`) | **SÍ — conservar.** Es el framework AXI + convención de errores/UX. |
| `caelus` | `storage/config.ts`, `adapters/ephemeris-gateway.ts`, `core/types.ts`, `core/{nodes,karma,charts,journey,projection,classical,evolutionary-reading}.ts`, `commands/{intake,journey}.ts` | **NO — eliminar.** Todo lo que lo importa es astrología o intake v1 (fuera de alcance). El `julianDay` que se necesitaba se reimplementa con Meeus (§1). |
| `caelus-birth` | `core/birth.ts` (`toUT`), `core/types.ts` (tipo `UTResult` → `BirthStatus`), `adapters/geocode.ts` (`openMeteoGeocoder` de `caelus-birth/geocode`) | **NO — eliminar.** Su única función en el corte era `toUT` (zona→offset→JD); v2 la reemplaza por offset explícito + Meeus. El geocoder también sale (lo resuelve el agente, decisión de charting). |
| `zod` | **solo** `commands/intake.ts` (`z`, `z.infer`, `ZodError`) | **NO recomendado — ver §5 (decisión tras ticket 01).** |
| `luxon` | **ninguno** en `src/`. Está en `node_modules` solo como dep transitoria de `caelus-birth` (importado en `node_modules/caelus-birth/dist/src/index.js`). Confirmado: **NO es dep directa** en `package.json`. | Se va sola al eliminar caelus-birth. No añadir. |
| `@types/bun` | devDep (`bun-types` es el nombre antiguo; el actual es `@types/bun`) | **Conservar** (dev). |
| `@biomejs/biome` | devDep | **Conservar** (dev, lint/format). |
| `typescript` | peerDep `^5` | **Conservar** (typecheck). |

### Lista de dependencias recomendada para lumen v2

```jsonc
"dependencies": {
	"axi-sdk-js": "^0.1.10"        // framework AXI + AxiError (errores/UX)
},
"devDependencies": {
	"@biomejs/biome": "^2.5.8",    // lint/format
	"@types/bun": "latest"         // tipos Bun
},
"peerDependencies": {
	"typescript": "^5"
}
// ELIMINADOS: caelus, caelus-birth, zod (zod pendiente de 01)
```

Razones por paquete:
- **`axi-sdk-js` KEEP** — `runAxiCli` en `cli.ts` y `AxiError` en `commands/profile.ts` y `storage/profile-store.ts` son el esqueleto del CLI v2 tal como está decidido (map.md: "Stack: Bun + TypeScript + axi-sdk-js").
- **`caelus` / `caelus-birth` REMOVE** — confirmado: nada del corte (`profile-store.ts`, `commands/profile.ts`, `core/birth.ts`, `core/types.ts`) necesita sus símbolos una vez que `birth.ts` usa Meeus puro y el contrato de entrada lleva offset explícito. En particular `profile-store.ts` importa `ResolvedBirth`/`BirthStatus` desde `core/types.ts` (que importa `UTResult` de caelus-birth); al redefinir esos tipos en el modelo v2 (ticket 01), el enlace desaparece. Adicionalmente `adapters/geocode.ts` (fuera de alcance en v2) tira de `caelus-birth/geocode`.
- **`zod` RECOMMENDATION: remove** — es la única fuente de validación y solo vive en `intake.ts`, módulo que el corte v2 rediseña. El contrato de entrada de v2 es diminuto (~7 campos): rangos enteros + días-por-mes/bisiesto + offset ±840 ≈ 30 líneas de aritmética pura (que además evita el footgun de `Date.UTC` años 0–99; ver §3). El núcleo (`core/birth.ts`) ya es libre de zod hoy — zod solo existe en la costura de intake. Con mensajes AxiError es igual de expresivo y más simple. **PERO** el ticket dice que la decisión final de zod depende del contrato de datos del ticket 01: si 01 define los tipos compartidos del modelo con esquemas zod, conservarlo es defendible (costo ~1 dep, tipos derivados con `z.infer`). Recomendación en firme: *drop zod; validación a mano*, salvo que 01 decida lo contrario (open point, §6).

---

## 5. Nota: el punto de decisión que cierra tras el ticket 01

La investigación de hechos (fórmula, vectores, árbol de deps salvo zod) **no depende** del ticket 01 y queda resuelta aquí. La decisión final de `zod` **sí** la cierra 01: si el modelo de datos v2 (campos de `ResolvedBirth`/`StoredProfile`, contrato de entrada) se especifica con esquemas zod, se conserva; si no, se elimina. La recomendación de este ticket es *eliminar* (validación a mano), en línea con el corte radical del pivot.

---

## 6. Fuentes citadas (primarias)

1. **Meeus, *Astronomical Algorithms*, 2.ª ed. (Willmann-Bell, 1998), cap. 7 "Julian Day"** — algoritmo recomendado. (Verificado por ejecución; los ejemplos 7.a y 7.b del libro como vectores 4 y 5.)
2. **Fliegel & Van Flandern, "Letters to the Editor", *Communications of the ACM* 11(10):657 (1968)** — fórmula de enteros equivalente. (Verificada por ejecución, bit-por-bit idéntica a Meeus en el rango probado.)
3. **`node_modules/caelus/dist/src/core.js` (líneas 43-53)** — `julianDay` de caelus = Meeus ch. 7 verbatim; fuente de la afirmación de continuidad numérica.
4. **`node_modules/caelus-birth/dist/src/index.js`** — `toUT`: delega el JD a `julianDay` de caelus; añade resolución de zona IANA vía `tz-lookup` + `luxon` (origen de la dep transitoria de luxon) y acota offsets en ±14 h; fuente del `status`/`dst` que v2 elimina.
5. **`package.json` del repo** — deps directas: `axi-sdk-js`, `caelus`, `caelus-birth`, `zod`; dev: `@biomejs/biome`, `@types/bun`; peer: `typescript`. `luxon` ausente (solo transitoria).
6. **`src/` del repo** — mapa de imports de la §4 (grep en todos los `src/**/*.ts`).
7. **MDN `Date.UTC`** — mapeo de años 0–99 al siglo XX (verificado por ejecución en el repo: `Date.UTC(50,…)` → 1950).
