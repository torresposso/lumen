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
│   ├── soul.ts                   # Plutón, PPP (deactivación cuando conj. NN), Midpoint, aspectos y lectura evolutiva completa
│   ├── nodes.ts                  # Eje nodal, regentes, skipped steps, cadenas de regentes nodales
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
│   └── config.ts                 # config.json: opciones de carta por defecto (sistema de casas, nodos; el flag gana)
│
├── commands/                     # 🔌 COMANDOS AXI DELGADOS (Parseo, llamado a core, TOON stdout)
│   ├── soul.ts                   # `lumen soul <profile>`
│   ├── journey.ts                # `lumen journey progressed|stations <profile>`
│   ├── karma.ts                  # `lumen karma pair --a <id> --b <id>`
│   ├── profile.ts                # `lumen profile add|list|show|remove`
│   ├── intake.ts                 # Intake natal compartido: zod + resolución de nacimiento (el único seam)
│   ├── chart.ts                  # `lumen chart natal|draconic` (insumo base + experimento etiquetado)
│   └── setup.ts                  # `lumen setup hooks` (Idempotente, Claude/Codex/OpenCode)
│
├── cli.ts                        # Enrutador axi-sdk-js con Home
└── version.ts
```

---

## 2. Catálogo de Comandos y Gramática AXI

### A. `lumen soul <profile>`
Radiografía del estado basal del Alma y la intención evolutiva.
- **Flags**: `[--when "..." --place "..."]` (inline) | `[--full]` (cadenas de dispositores completas + eclipses prenatales).
- **Garantías de Borde (AXI §5)**:
  - Si Plutón está conjunto al Nodo Norte: `pppActive: false` y `ppp: "none (Direct integration through North Node)"`.
  - Si no hay pasos saltados: `skippedSteps: 0`.

```text
soul:
  profile: silvia
  pluto: Scorpio/H8
  ppp: Taurus/H2
  southNode: Pisces/H12
  northNode: Virgo/H6
  phase: Balsamic
evolutionaryMechanics:
  pppActive: true
  plutoNodeMidpoint: "Sagittarius 18°24' (H9)"
  nodeMotion: retrograde
  plutoStressful: 3
  plutoNonstressful: 2
  skippedSteps[1]{body,aspect,orb}:
    Mars,Square Nodal Axis,1.4°
  nodalRulers:
    southNodeRuler: "Neptune in Capricorn/H10 (Direct)"
    northNodeRuler: "Mercury in Sagittarius/H9 (Direct)"
help[1]:
  Run `lumen soul silvia --full` for dispositor chains, prenatal eclipses and fine orbs
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
- `list`: Respeta privacidad AXI. Lista solo `id` y `provenance` (estado `ok | ambiguous | nonexistent`). Cero fechas de nacimiento en contexto ambiente.
- `show <id>`: Único comando que expone los datos de nacimiento; el Home mantiene la misma privacidad.
- `remove <id>`: Idempotente (exit 0 si ya fue eliminado).

---

## 3. Invariantes de Sistema y Ética

1. **Privacidad de los datos personales**: Perfiles en `~/.config/lumen/lumen.db` (bun:sqlite, permisos `0600`, migraciones con `PRAGMA user_version`).
2. **Cero Determinismo sobre la Conciencia**:
   - Lumen jamás intenta clasificar, etiquetar ni calcular el nivel o estado evolutivo de conciencia de una persona. La carta natal solo contiene geometría y tiempo astronómico; el significado de cómo el individuo vive esa geometría solo existe en el diálogo y la vida real de la persona.
