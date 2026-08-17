# Especificación Definitiva del Sistema Lumen (JWG + AXI)

> **"El alma manda, la mecánica obedece, y AXI es el idioma que habla el instrumento."**

---

## 1. Arquitectura de Módulos Profundos y Fronteras de Pureza

Límites estrictos: `core/` no realiza I/O (ni red ni filesystem). Los adaptadores externos y la persistencia viven en sus propias capas.

```text
src/
├── core/                         # 🧠 CÁLCULO PURO & MECÁNICA EVOLUTIVA (Zero I/O, Zero CLI)
│   ├── types.ts                  # Tipos de dominio (ResolvedBirth) y geometría zodiacal compartida
│   ├── birth.ts                  # Puro: Zonas, Julian Day UT, validación y procedencia (el zod vive en commands/intake.ts)
│   ├── soul.ts                   # Plutón, PPP (deactivación cuando conj. NN), Midpoint, aspectos
│   ├── nodes.ts                  # Eje nodal, regentes, skipped steps, cadenas de regentes nodales
│   ├── phases.ts                 # Fases Sol-Luna natales y progresadas (8 arquetipos)
│   ├── journey.ts                # Progresiones secundarias, triggers a puntos EA dentro de orbe, estaciones
│   ├── karma.ts                  # Sinastría evolutiva y contactos inter-cartas a Nodos/Plutón
│   └── classical.ts              # Proyecciones auxiliares explícitas: Dracónica (experimento etiquetado)
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
│   ├── chart.ts                   # `lumen chart natal [--evo]|draconic` (insumo base + mecánica opt-in)
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
- **`--evo`**: bloque `evo` completo — Plutón/PPP, midpoint, eje nodal, fase Sol-Luna, cadenas de dispositores y eclipses prenatales.
- **Bordes (AXI)**:
  - Si Plutón está conjunto al Nodo Norte: `ppp.active: false`.
  - Si no hay pasos saltados: `skippedSteps: []`.
  - `chart draconic --evo` → `VALIDATION_ERROR` (draconic es puramente geométrico).

```text
chart: { ... }              # base idéntico al actual
evo:
  pluto:
    lon: 204.3457
    sign: Scorpio
    signDeg: 24.3457
    house: 8
    retrograde: false
    stressfulCount: 3
    nonstressfulCount: 2
    aspects: [...]          # orbes PLUTO_ASPECTS; puede diferir de chart.aspects
  ppp:
    lon: 24.3457
    sign: Taurus
    signDeg: 24.3457
    house: 2
    active: true
    aspects: [...]
  midpoint: "Virgo 17°38' (H10)"
  antiMidpoint: "Pisces 17°38' (H4)"
  nodalAxis:
    north: { lon, sign, signDeg, house, ruler, rulerPlacement, aspects[] }  # incluye Plutón
    south: { lon, sign, signDeg, house, ruler, rulerPlacement, aspects[] }  # incluye Plutón
    motion: retrograde
    skippedSteps: []        # Plutón nunca aparece en skippedSteps
  phase: Balsamic
  dispositorChains: { pluto, southNodeRuler, northNodeRuler }
  prenatalEclipses: { solar, lunar }
```

---

### B. `lumen journey <subcommand> <profile>`
El reloj temporal del Alma: progresiones secundarias y giros estacionales.

1. **`lumen journey progressed <profile> --at <YYYY-MM-DD> [--bodies moon,sun,pluto] [--orb 3]`**
   - Incluye **Fase Sol-Luna progresada** como campo de primera clase.
   - Contactos de cuerpos progresados a puntos EA natales (Plutón, PPP, Eje Nodal) dentro de orbe.
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
- `list`: Respeta privacidad AXI. Lista solo `id` y procedencia válida. Cero fechas de nacimiento en contexto ambiente.
- `show <id>`: Único comando que expone los datos de nacimiento; el Home mantiene la misma privacidad.
- `remove <id>`: Idempotente (exit 0 si ya fue eliminado).

---

## 3. Invariantes de Sistema y Ética

1. **Privacidad de los datos personales**: Perfiles en `~/.config/lumen/lumen.db` (bun:sqlite, permisos `0600`, migraciones con `PRAGMA user_version`).
2. **Cero Determinismo sobre la Conciencia**:
   - Lumen jamás intenta clasificar, etiquetar ni calcular el nivel o estado evolutivo de conciencia de una persona. La carta natal solo contiene geometría y tiempo astronómico; el significado de cómo el individuo vive esa geometría solo existe en el diálogo y la vida real de la persona.
