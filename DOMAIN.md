# Especificación Definitiva del Sistema Lumen (Astrología Evolutiva + AXI)

> **"El alma manda, la mecánica obedece, y AXI es el idioma que habla el instrumento."**

---

## 1. Arquitectura de Módulos Profundos y Fronteras de Pureza

Límites estrictos: `core/` no realiza I/O (ni red ni filesystem). Los adaptadores externos y la persistencia viven en sus propias capas.

```text
src/
├── core/                         # 🧠 CÁLCULO PURO & MECÁNICA EVOLUTIVA (Zero I/O, Zero CLI)
│   ├── types.ts                  # Tipos de dominio, geometría zodiacal compartida y seam `Ephemeris`
│   ├── birth.ts                  # Puro: Zonas, Julian Day UT y procedencia (la validación de flags vive en commands/intake.ts)
│   ├── charts.ts                 # Cálculo de cartas desde NatalRequest: opciones completas + canon true-node (ADR-0013)
│   ├── soul.ts                   # Plutón, PPP (deactivación cuando conj. NN), Midpoint, aspectos y lectura evolutiva completa
│   ├── nodes.ts                  # Eje nodal, regentes, skipped steps, cadenas de regentes nodales
│   ├── evolutionary-reading.ts    # Ensambla la lectura evolutiva (`evo`): publicación en una sola fuente (ADR-0010)
│   ├── reading.ts                # Ensambla la lectura natal completa: chart + projection + evo + help (ADR-0012)
│   ├── projection.ts             # Proyección de la carta al TOON: mapping y política de precisión en una fuente (ADR-0011)
│   ├── phases.ts                 # Fases Sol-Luna natales y progresadas (8 arquetipos)
│   ├── journey.ts                # Progresiones secundarias, triggers a puntos EA dentro de orbe, estaciones
│   ├── karma.ts                  # Sinastría evolutiva y contactos inter-cartas a Nodos/Plutón
│   └── classical.ts              # Síntesis de carta: patrones, firmas, átomos y Dracónica (experimento etiquetado)
│
├── adapters/                     # 🌐 I/O EXTERNO & ADAPTADORES
│   ├── geocode.ts                # Adaptador Open-Meteo, fallback offline y contratos de mock
│   └── ephemeris-gateway.ts      # Enlace con Caelus / SwissEph
│
├── storage/                      # 💾 PERSISTENCIA LOCAL (XDG ~/.config/lumen/ - lumen.db bun:sqlite - 0600)
│   ├── profile-store.ts          # Perfiles en lumen.db (bun:sqlite, PRAGMA user_version, 0600)
│   └── config.ts                 # config.json: opciones de carta por defecto (sistema de casas; el flag gana)
│
├── commands/                     # 🔌 COMANDOS AXI DELGADOS (Parseo, llamado a core, TOON stdout)
│   ├── journey.ts                # `lumen journey progressed|stations <profile>`
│   ├── karma.ts                  # `lumen karma pair --a <id> --b <id>`
│   ├── profile.ts                # `lumen profile add|list|show|remove`
│   ├── intake.ts                 # Intake natal compartido: zod + resolución de nacimiento (el único seam)
│   ├── chart.ts                  # `lumen chart natal [--evo]|draconic` (insumo base + mecánica opt-in)
│   └── setup.ts                  # `lumen setup hooks` (Idempotente, Claude/Codex/OpenCode)
│
├── cli.ts                        # Enrutador axi-sdk-js con Home
└── version.ts
```

---

## 2. Catálogo de Comandos y Gramática AXI

### A. `lumen chart natal <profile> [--evo]`

Carta natal base y, con `--evo`, la mecánica evolutiva completa en un solo bloque.

- **Sin flag**: carta base, igual que hoy (sin lectura).
- **`--evo`**: bloque `evo` completo — Plutón/PPP, midpoint, eje nodal, fase Sol-Luna, cadenas de dispositores y eclipses prenatales, con `counts` (puente con `summary`), `method` (disclosure factual de orbes/criterios) y grados redondeados a 4 decimales (una sola política de precisión, ADR-0011). Con `--evo`, `interpretationContext` añade átomos de la mecánica evolutiva.
- **Bordes (AXI)**:
  - Si Plutón está conjunto al Nodo Norte (orbe ≤ `PPP_DEACTIVATION_ORB`):
    `ppp.active: false` y `ppp.reason` (con la separación medida);
    `ppp.separation` = la medida de core sobre el Nodo Verdadero (la misma
    referencia que la regla, sin fallback), presente en el estado natal por defecto.
  - Si no hay pasos saltados: `skippedSteps: []`.
  - `chart draconic --evo` → `VALIDATION_ERROR` (draconic es puramente geométrico).
  - `--bodies` es aditivo (extra bodies, p. ej. `mean_lilith`); no excluye Plutón/nodos.

```text
chart: { ... }              # base idéntico al actual (datos de Erik 1981-01-26 00:51)
evo:
  pluto:
    lon: 204.3457
    sign: Libra
    signDeg: 24.3457
    house: 12
    retrograde: false
    stressfulCount: 2
    nonstressfulCount: 3
    aspects: [...]          # orbes PLUTO_ASPECTS; puede diferir de chart.aspects
  ppp:
    lon: 24.3457
    sign: Aries
    signDeg: 24.3457
    house: 6
    active: true
    separation: 73.44       # Plutón–Nodo Norte, grados (2 dp)
    aspects: [...]
  midpoint: "Virgo 17°38' (H10)"
  antiMidpoint: "Pisces 17°38' (H4)"
  nodalAxis:
    north: { lon: 130.9058, sign: Leo, signDeg: 10.9058, house: 9, ruler, rulerPlacement, aspects[] }  # incluye Plutón
    south: { lon: 310.9058, sign: Aquarius, signDeg: 10.9058, house: 3, ruler, rulerPlacement, aspects[] }  # incluye Plutón
    motion: direct
    skippedSteps[1]{body,aspect,orb}: chiron,square,2.5025   # Plutón nunca aparece en skippedSteps
  phase: Disseminating
  dispositorChains: { pluto, southNodeRuler, northNodeRuler }
  prenatalEclipses: { solar, lunar }
  counts:                   # puente summary↔evo
    plutoAspects: 5
    nodeAspects: 16
    skippedSteps: 1
    eclipses: 2
  method: "orbs PLUTO_ASPECTS: 10° conjunction/opposition, 8° square/trine, 6° sextile, 3° semisextile/semisquare/sesquiquadrate/quincunx, 2° septile/quintile/biquintile; ppp: major aspects only (orb 5°); skipped: squares to the nodal axis (orb 5°); ppp inactive when pluto conjunct the north node (orb 10°)"   # derivado de las tablas de core (describeEvoCriteria), nunca a mano
```

---

### B. `lumen journey <subcommand> <profile>`

El reloj temporal del Alma: progresiones secundarias y giros estacionales.

1. **`lumen journey progressed <profile> --at <YYYY-MM-DD> [--bodies moon,sun,pluto] [--orb 3]`**
   - Incluye **Fase Sol-Luna progresada** como campo de primera clase.
   - Contactos de cuerpos progresados a puntos EA natales (Plutón, PPP, Eje Nodal) dentro de orbe.
   - `lon`/`signDeg` de los cuerpos progresados redondeados a 4 decimales (la misma
     política única de precisión que la carta base; ADR-0011).
2. **`lumen journey stations <profile> --body <name> [--from <YYYY-MM-DD>] [--to <YYYY-MM-DD>] [--limit 30]`**
   - Estaciones planetarias en la ventana temporal especificada.

---

### C. `lumen karma pair --a <id> --b <id> [--orb 3]`

Acuerdos y contratos evolutivos entre dos Almas.

- Contactos cruzados inter-cartas a Plutón y Nodos.
- Superposiciones de casas del eje nodal.
- **Vacío explícito**: Si no hay contactos en orbe: `contacts: 0 contacts found within orb 3°`.

---

### D. `lumen profile <action>`

- `add <id> --when "..." --place "..."`: Si el ID existe, actualiza (no-op/update idempotente).
- `list`: Respeta privacidad AXI. Lista solo `id` y `provenance` (estado `ok | ambiguous | nonexistent`). Cero fechas de nacimiento en contexto ambiente.
- `show <id>`: Único comando que expone los datos de nacimiento; el Home mantiene la misma privacidad.
- `remove <id>`: Idempotente (exit 0 si ya fue eliminado).

---

## 3. Invariantes de Sistema y Ética

1. **Privacidad de los datos personales**: Perfiles en `~/.config/lumen/lumen.db` (bun:sqlite, permisos `0600`, migraciones con `PRAGMA user_version`).
2. **Cero Determinismo sobre la Conciencia**:
   - Lumen jamás intenta clasificar, etiquetar ni calcular el nivel o estado evolutivo de conciencia de una persona. La carta natal solo contiene geometría y tiempo astronómico; el significado de cómo el individuo vive esa geometría solo existe en el diálogo y la vida real de la persona.
