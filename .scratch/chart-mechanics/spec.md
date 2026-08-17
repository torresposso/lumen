# Chart Evo: integración de mecánica evolutiva en `chart natal`

> **Estado**: Implementada — `bun test`/typecheck/`check` en verde (162 tests, 516 expect).
> **Commit**: `632470b` (2026-08-17) — cierre de la feature; audit y fixes en `.scratch/chart-evo-fixes/`.
> **Fecha**: 2026-08-16
> **Autor**: Erick (capitán)
> **Flag**: `--evo` · Output block: `evo` · Sin `--full`.

---

## 1. Decisión (cerrada)

1. **`chart natal` sin flags sigue exactamente igual** — output actual, sin cambios.
2. **`chart natal --evo`** activa la mecánica evolutiva como un bloque adicional completo:
   - Plutón (signo, casa, retrogradación, counts, aspectos)
   - PPP (signo, casa, `active`, aspectos)
   - Plutón–Nodo Norte midpoint
   - Eje nodal (norte/sur, regentes, motion, skipped steps, node aspects)
   - Fase Sol-Luna
   - Cadenas de dispositores
   - Eclipses prenatales
3. **Sin flag `--full`**: el bloque `evo` entrega todo en una sola llamada. No existe segundo nivel de detalle.
4. **Cero interpretación**: solo datos calculados; ninguna frase como “tendencia a transformarse” o “evolución del alma”.
5. **`chart draconic` rechaza `--evo`** con error estructurado (la proyección draconic no lleva mecánica evolutiva).
6. **El comando `soul` se elimina** para evitar rutas duplicadas. `chart natal --evo` lo reemplaza. Sin alias.

---

## 2. Gramática

```bash
# Carta base (sin cambios)
lumen chart natal <profile>
lumen chart natal --when "..." --place "..."

# Carta base + mecánica evolutiva completa
lumen chart natal <profile> --evo
lumen chart natal --when "..." --place "..." --evo

# Draconic: sin cambios, rechaza --evo
lumen chart draconic <profile>
```

`--evo` es una flag booleana: acepta solo `--evo` (true) o `--evo=false|true`.

---

## 3. Contrato de salida

### 3.1 Output base (siempre)

```typescript
type AstrologicalReading = {
  chart: Projection & { birth: BirthEcho };
  summary: { bodies, aspects, applying, separating, exact };
  interpretationContext?: InterpretationContext;  // átomos factuales para LLM
  evo?: EvoOutput;                                // solo con --evo
  help?: string[];
};
```

El base es exactamente el de hoy: `chart` (meta, bodies, angles, cusps, aspects,
declinationAspects, patterns, signature, birth), `summary` y
`interpretationContext` (átomos factuales). Sin cambios.

### 3.2 Output con `--evo`

```text
evo:
  pluto:
    lon: 204.3457
    sign: Scorpio
    signDeg: 24.3457
    house: 8
    retrograde: false
    stressfulCount: 3
    nonstressfulCount: 2
    aspects: [{ body, aspect, orb, stress, phase }]
  ppp:
    lon: 24.3457
    sign: Taurus
    signDeg: 24.3457
    house: 2
    active: true            # false si Plutón conj. Nodo Norte
    aspects: [{ body, aspect, orb }]
  midpoint: "Virgo 17°38' (H10)"      # midpoint cercano (arco corto)
  antiMidpoint: "Pisces 17°38' (H4)"  # opuesto al midpoint
  nodalAxis:
    north:
      lon: 130.9058
      sign: Virgo
      signDeg: 10.9058
      house: 6
      ruler: mercury
      rulerPlacement: { body: "mercury", sign: "Sagittarius", signDeg: 12, house: 9, motion: "direct" }
      aspects: [{ body, aspect, orb, stress }]   # incluye contactos de Plutón
    south:
      lon: 310.9058
      sign: Pisces
      signDeg: 10.9058
      house: 12
      ruler: neptune
      rulerPlacement: { body: "neptune", sign: "Capricorn", signDeg: 20, house: 10, motion: "direct" }
      aspects: [{ body, aspect, orb, stress }]   # incluye contactos de Plutón
    motion: retrograde
    skippedSteps: [{ body: "Mars", aspect: "square", orb: 1.4 }]   # [] si no hay; Plutón nunca aparece aquí
  phase: Balsamic
  dispositorChains:
    pluto: [{ body, sign, ruler }]
    southNodeRuler: [{ body, sign, ruler }]
    northNodeRuler: [{ body, sign, ruler }]
  prenatalEclipses:
    solar:  { tMax, type, lon, sign, signDeg, house }
    lunar:  { tMax, type, lon, sign, signDeg, house }
```

### 3.3 Reglas de forma

- **No duplicación**: `pluto.aspects`, `ppp.aspects` y `nodeAspects` viven una sola vez, dentro de `evo`. No hay segunda copia.
- **Orbes evolutivos**: `evo` usa el set `PLUTO_ASPECTS` (p. ej. conjunción/oposición a 10°). Puede incluir contactos ausentes de `chart.aspects`; esto es deliberado.
- **Vacíos definitivos**:
  - `skippedSteps` siempre array; vacío = `[]`.
  - `prenatalEclipses.solar` / `.lunar`: si no hay eclipse en la ventana, la clave se omite.
  - `midpoint` siempre presente cuando el cálculo es posible; si el Nodo Norte no está disponible, el comando falla con `CALCULATION_ERROR` (ver §4).
- **TOON**: las listas usan el formato compacto del resto de `chart`: `aspects[5]{body,aspect,orb,stress,phase}`, etc.
- **`help[]`**: con `--evo`, si aplica, se mantiene el siguiente paso contextual (p. ej. perfil guardable / inline flags), de forma análoga al actual `soul`.

---

## 4. Semántica de errores

| Caso | Comportamiento |
|---|---|
| `chart natal` sin flags | Output base, sin `evo` |
| `chart natal <profile> --evo` | Output base + bloque `evo` |
| `chart draconic --evo` | `VALIDATION_ERROR` con help: `Use ` + "`lumen chart natal --evo`" |
| `--evo` con `--bodies` que excluye `pluto` o `true_node` | `CALCULATION_ERROR` con hint: “ensure --bodies includes pluto and true_node, or use defaults” |
| `--evo` sin Sol o Luna (phase no calculable) | No se inventa fase: se omite `phase` o se reporta la ausencia; nunca un default engañoso |
| Flags desconocidos | Rechazados como hoy (pattern AXI) |

---

## 5. Estructura actual del código (línea base verificada)

### 5.1 Comandos (superficie actual: 6)

```
soul       Plutón, PPP, eje nodal, eclipses prenatales (--full)
journey    Progresiones secundarias y estaciones
karma      Sinastría evolutiva
profile    Perfiles locales de nacimiento
chart      Carta natal y draconic
setup      Hooks de sesión
```

### 5.2 Archivos relevantes

| Archivo | Responsabilidad actual |
|---|---|
| `src/commands/chart.ts` | `chart natal\|draconic`. `AstrologicalEngine.compute()` genera `AstrologicalReading` |
| `src/commands/soul.ts` | `soul`, con `computeSoulReading()` + `computeNodalReading()` + `computeSolLunaPhase()` |
| `src/commands/intake.ts` | Parser con zod. `chartFlagSpec` genera flags: `when/place/year/month/day/hour/minute/lat/lon/zone/house-system/zodiac/bodies/topocentric` |
| `src/core/soul.ts` | `computeSoulReading()`, `computePlutoAspects()`, `computePPPAspects()`, `buildDispositorChain()` |
| `src/core/nodes.ts` | `computeNodalReading()`, `computeSkippedSteps()`, `computePrenatalEclipses()` |
| `src/core/phases.ts` | `computeSolLunaPhase()` |
| `src/core/types.ts` | `ChartRequestOptions`, `NatalRequest` |
| `src/cli.ts` | Router de 6 comandos |
| `tests/commands/chart.test.ts` | 16 tests de `chartCommand` |
| `tests/commands/soul.test.ts` | 3 tests de `soulCommand` |

### 5.3 Duplicación actual

Hoy `chart natal` y `soul` resuelven el mismo nacimiento y llaman a `CaelusEphemeris.chartAt()` independientemente:

```
soul.ts L74-81:   ephemeris.chartAt(birth.jdUt, birth.lat, birth.lon, ...)
chart.ts L282-289: this.ephemeris.chartAt(birth.jdUt, birth.lat, birth.lon, ...)
```

La mecánica de `soul` debe reutilizar el mismo `AstrologicalEngine` para eliminar la segunda ruta.

---

## 6. Cambios internos

```typescript
// Nuevo (src/commands/chart.ts o src/core/types.ts)
interface ChartOutputSelection {
  evo: boolean;   // --evo
}

// AstrologicalEngine.compute pasa a aceptar la selección de output
compute(request: NatalRequest, selection?: ChartOutputSelection): AstrologicalReading;

// chartFlagSpec se extiende
export const chartFlagSpec: FlagSpec = deriveFlagSpec(
  [birthSchema, optionsSchema],
  {
    value: ["when", "place"],
    boolean: ["topocentric", "evo"],   // ← agregar evo
  },
  ["draconic"],
);
```

`NatalRequest` **no** se extiende: `ChartOutputSelection` es una preocupación de
capa de comandos, no del motor de entrada compartido (evita contaminar
`journey`/`karma`/perfiles).

**Punto crítico — parser posicional:** hoy `resolveRequest()` rechaza
`chart natal <profile> --evo` (`src/commands/chart.ts:391-401` y `:404-413`).
Hay que separar las flags de salida (`--evo`) del parser de nacimiento antes de
validar el perfil posicional, de forma análoga a como `soul.ts:29-30` pre-filtra
`--full`.

---

## 7. Orden de implementación (doc-first)

| Paso | Ticket | Descripción | Bloqueado por |
|---|---|---|---|
| 1 | `01-adr-norte` | ADR/ticket del norte: mover mecánica a `chart natal`, retirar `soul` de la superficie. Primera línea responde “¿sirve a mi Nodo Norte?” | Ninguno |
| 2 | `02-docs-evo` | Actualizar SPEC §3 (5 comandos), DOMAIN, CONTEXT, README, Home y help de `profile add`. Eliminar `--full` y `soul` del catálogo. Documentar output `evo`. | 01-adr-norte |
| 3 | `03-intake` | Agregar `--evo` al flag spec y arreglar `resolveRequest` para perfil + `--evo`. | 02-docs-evo |
| 4 | `04-engine` | `AstrologicalEngine.compute()` acepta `ChartOutputSelection` y genera bloque `evo` completo. | 03-intake |
| 5 | `05-draconic-reject` | `chart draconic --evo` → `VALIDATION_ERROR` estructurado. | 03-intake |
| 6 | `06-delete-soul` | Borrar `src/commands/soul.ts`, registro en `cli.ts`, tests de soul. Migrar a `chart.test.ts` y `profile.test.ts`. | 04-engine, 05-draconic-reject |
| 7 | `07-tests` | Tests: default idéntico, `--evo` completo, draconic rechaza, `pppActive=false`, vacíos (`skippedSteps: []`), ausencia de Sol/Luna, `--bodies` sin pluto. | 06-delete-soul |
| 8 | `08-check` | `bun run check:docs && bun test && bun run check` todo verde. | 07-tests |

---

## 8. Riesgos conocidos y mitigación

| Riesgo | Severidad | Mitigación |
|---|---|---|
| `profile.test.ts` y `profile.ts` (help) apuntan a `soul` | Media | Migrar explícitamente en paso 6; actualizar help en paso 2 |
| `chartUsage`/`chartNatalUsage` mencionan `soul` | Media | Actualizar textos y mantener el test `usage ↔ flagSpec` en verde |
| `check:docs` solo valida SPEC §3 ↔ `cli.ts` y árbol `src/` | Baja | Complementar con tests de help y surface; los docs se actualizan antes del código |
| Cambio de semántica topocentric/bodies entre `soul` y `chart --evo` | Media | Usar las mismas `ChartRequestOptions` que `chart`; documentar que `--evo` respeta `--topocentric`/`--bodies` |
| `phase` con Sol/Luna ausentes | Media | Nunca inventar `Balsamic`; omitir o reportar ausencia |
| `--evo` con `--bodies` excluyendo pluto/nodos | Alta | `CALCULATION_ERROR` estructurado con hint |
| Output `evo` pesado (~3 KB) | Baja | Aceptado deliberadamente: es opt-in y una sola llamada; futuro `--fields` puede recortar |
| ADR-0003 referencia `src/core/evolutionary.ts` (histórico) | Baja | Documentar en docs que el módulo real es `core/soul` + `core/nodes` + `core/phases` |

---

## 9. Impacto en docs (no exhaustivo)

- SPEC §3: superficie de **5 comandos** (`journey`, `karma`, `profile`, `chart`, `setup`).
- DOMAIN.md / docs/agents/domain.md: quitar `soul.ts` del árbol de `commands/`; mover sección A de `soul` a `chart natal --evo`; actualizar árbol.
- CONTEXT.md: redefinir “Evolutionary reading” como `chart natal --evo`; añadir `evo` como término.
- README: ejemplos `lumen soul ...` → `lumen chart natal ... --evo`.
- `src/cli.ts`: Home y `topLevelHelp` sin `soul`.
- `src/commands/profile.ts`: help `Run lumen soul ...` → `Run lumen chart natal ... --evo`.
- `.scratch/chart-mechanics/`: crear `map.md` e `issues/NN-*.md` según `docs/agents/issue-tracker.md`.
