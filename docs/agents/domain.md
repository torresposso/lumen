# Especificación Definitiva del Sistema Lumen (JWG + AXI)

> **"El alma manda, la mecánica obedece, y AXI es el idioma que habla el instrumento."**

---

## 1. Arquitectura de Módulos Profundos y Fronteras de Pureza

Límites estrictos: `core/` no realiza I/O (ni red ni filesystem). Los adaptadores externos y la persistencia viven en sus propias capas.

```text
src/
├── core/                         # 🧠 CÁLCULO PURO & MECÁNICA EVOLUTIVA (Zero I/O, Zero CLI)
│   ├── types.ts                  # Tipos de dominio (ResolvedBirth, EAChart, Consultation, Hipotesis)
│   ├── birth.ts                  # Puro: Zonas, Julian Day UT, validación y procedencia
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
├── storage/                      # 💾 PERSISTENCIA LOCAL (XDG ~/.config/lumen/ - 0600 - Atomic Rename)
│   ├── client-store.ts           # Gestión de clientes/perfiles (con retrocompatibilidad)
│   └── consultation-store.ts     # Expedientes clínicos, hipótesis, confirmaciones y notas
│
├── commands/                     # 🔌 COMANDOS AXI DELGADOS (Parseo, llamado a core, TOON stdout)
│   ├── soul.ts                   # `lumen soul <client>`
│   ├── journey.ts                # `lumen journey progressed|stations <client>`
│   ├── karma.ts                  # `lumen karma pair --a <id> --b <id>`
│   ├── consulta.ts               # `lumen consulta abrir|preparar|leer|confirmar|cerrar`
│   ├── client.ts                 # `lumen client add|list|show|remove` (alias `profile`)
│   ├── classical.ts              # `lumen classical draconic|chart` (Sala de máquinas)
│   └── setup.ts                  # `lumen setup hooks` (Idempotente, Claude/Codex/OpenCode)
│
├── cli.ts                        # Enrutador axi-sdk-js con Home / Agenda de consultas del día
└── version.ts
```

---

## 2. Catálogo de Comandos y Gramática AXI

### A. `lumen soul <client>`
Radiografía del estado basal del Alma y la intención evolutiva.
- **Flags**: `[--when "..." --place "..."]` (inline) | `[--full]` (cadenas de dispositores completas).
- **Garantías de Borde (AXI §5)**:
  - Si Plutón está conjunto al Nodo Norte: `pppActive: false` y `ppp: "none (Direct integration through North Node)"`.
  - Si no hay pasos saltados: `skippedSteps: 0`.

```text
soul:
  client: silvia
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
help[2]:
  Run `lumen soul silvia --full` for dispositor chains and fine orbs
  Run `lumen consulta abrir silvia --motivo "..."` to begin consultation
```

---

### B. `lumen journey <subcommand> <client>`
El reloj temporal del Alma: progresiones secundarias y giros estacionales.

1. **`lumen journey progressed <client> --at <YYYY-MM-DD> [--bodies moon,sun,pluto] [--orb 3]`**
   - Incluye **Fase Sol-Luna progresada** como campo de primera clase.
   - Contactos de cuerpos progresados a puntos EA natales (Plutón, PPP, Eje Nodal) dentro de orbe.
2. **`lumen journey stations <client> --body <name> [--from <YYYY-MM-DD>] [--to <YYYY-MM-DD>] [--limit 30]`**
   - Estaciones planetarias en la ventana temporal especificada.

---

### C. `lumen karma pair --a <id> --b <id> [--orb 3]`
Acuerdos y contratos evolutivos entre dos Almas.
- Contactos cruzados inter-cartas a Plutón y Nodos.
- Superposiciones de casas del eje nodal.
- **Vacío explícito**: Si no hay contactos en orbe: `contacts: 0 contacts found within orb 3°`.

---

---

### D. `lumen consulta <subcommand> <client>`
El ciclo de registro del diálogo e hipótesis clínicas.
*(El expediente de consulta es un flujo puramente administrativo/técnico de sesión: `abierta` ➔ `cerrada`. No evalúa ni califica al consultante).*

```text
lumen consulta
├── abrir <client> --motivo "..."
├── preparar <client>
├── leer <client> --capa evidencia|arquetipo|preguntas
├── confirmar <client> --hipotesis <ID> --respuesta <enum> [--nota "..."]
└── cerrar <client> --sintesis "..." --tarea "..."
```

#### Flujo de Hipótesis (`preparar` ➔ `confirmar`):

1. **`lumen consulta preparar silvia`**:
```text
consulta:
  client: silvia
  session: open
hipotesis[2]{id,campo,pregunta,respuestasValidas}:
  H1,pluton_nodo_sur,"¿El consultante describe patrones de repetición o de cosecha en esta temática?",reliving|fruition|dual
  H2,skipped_step_mars,"¿Cómo se canaliza la acción/deseo según el relato del consultante?",activo|en_proceso|integrado
help[2]:
  Run `lumen consulta confirmar silvia --hipotesis H1 --respuesta reliving`
  Run `lumen consulta leer silvia --capa preguntas` for the full dialogue guide
```

2. **`lumen consulta confirmar silvia --hipotesis H1 --respuesta reliving --nota "El consultante refiere repetición de patrones de subordinación"`**:
   - Enums cerrados doctrinales (`reliving | fruition | dual` para dinámicas Plutón-SN según JWG).
   - `--nota` libre para registrar las palabras del consultante.
   - Idempotente: confirmar la misma hipótesis actualiza la respuesta registrada.
   - Si la hipótesis no existe, error AXI estructurado con la lista de IDs válidos.

---

### E. `lumen client <action>` (y alias `profile`)
- `add <id> --when "..." --place "..."`: Si el ID existe, actualiza (no-op/update idempotente).
- `list`: Respeta privacidad AXI. Lista solo IDs, procedencia válida y si la sesión está abierta/cerrada. Cero fechas de nacimiento en contexto ambiente.
- `show <id>`: Detalle de datos de nacimiento del consultante.
- `remove <id>`: Idempotente (exit 0 si ya fue eliminado).

---

## 3. Invariantes de Sistema y Ética

1. **Privacidad de Grado Clínico**: Stores en `~/.config/lumen/` con permisos `0600`, escrituras atómicas (`tmp + rename`) y versionado de esquema.
2. **Idempotencia en Sesión**:
   - `consulta abrir` sobre sesión ya abierta = No-op exitoso (`session: open`).
   - `consulta cerrar` sobre sesión ya cerrada = No-op exitoso (`session: closed`).
3. **Cero Determinismo sobre la Conciencia**:
   - Lumen jamás intenta clasificar, etiquetar ni calcular el nivel o estado evolutivo de conciencia de una persona. La carta natal solo contiene geometría y tiempo astronómico; el significado de cómo el individuo vive esa geometría solo existe en el diálogo y la vida real del consultante.
