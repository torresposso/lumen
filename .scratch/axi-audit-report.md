# Audit Report: AXI Compatibility Check for `lumen`

**Date**: 2026-08-13
**Tool**: `lumen` (Astrología evolutiva computacional desde la terminal)
**SDK**: `axi-sdk-js` v0.1.10

---

## Executive Summary

An audit against the 10 core principles of the **Agent eXperience Interface (AXI)** specification ([SKILL.md](file:///home/erick/.agents/skills/axi/SKILL.md)) was conducted for `lumen`.

`lumen` is built on `axi-sdk-js`, inheriting native AXI capabilities (TOON output formatting, structured error messages, fast-path `--version`, and multi-harness session hook integration).

Overall Compatibility Rating: **10 / 10 Pass** (Full Compliance).

---

## Detailed Principle Audit

### 1. Token-efficient output (TOON Format)
- **Status**: ✅ PASS
- **Details**: `runAxiCli` automatically formats output objects into TOON on stdout. Collections such as `cusps[12]{lon,sign,signDeg}` and `aspects[16]{a,b,aspect,orb,phase,strength}` use compact header array syntax.

### 2. Minimal default schemas
- **Status**: ✅ PASS
- **Details**:
  - `chart` returns structured objects without visual decoration or ASCII charts.
  - Lists and sub-collections (e.g. `cusps`, `aspects`) include only relevant projection fields (`lon`, `sign`, `signDeg`, `a`, `b`, `aspect`, `orb`, `phase`, `strength`).
  - Extended calculations (`--eclipses`, `--lots`, `--stars`, `--evolutionary`) are opt-in flags.

### 3. Content truncation
- **Status**: ✅ PASS
- **Details**: `lumen` output focuses on numerical astronomical values and concise categorical strings. Diagnostic help strings and error hints are compact and concise.

### 4. Pre-computed aggregates
- **Status**: ✅ PASS
- **Details**:
  - `chart` output includes a pre-computed `summary` block (`bodies`, `aspects`, `applying`, `separating`, `exact`).
  - Agents can determine aspect breakdown in 1 step without client-side array iteration.

### 5. Definitive empty states
- **Status**: ✅ PASS
- **Details**: Optional sub-fields (`eclipses`, `lots`, `stars`, `evolutionary`) are cleanly omitted or explicitly populated when activated. Unused extra bodies default to empty array `[]`.

### 6. Structured errors & exit codes
- **Status**: ✅ PASS / Loud failure on unknown input
- **Details**:
  - Exit Code `2` for validation errors (e.g., unknown flags like `--invalid-flag`).
  - Standardized error format with error message, error code, and actionable `help` hints listing valid flags.
  - Non-interactive: all parameters supplied via CLI flags.

### 7. Ambient context via session integrations
- **Status**: ✅ PASS
- **Details**:
  - `lumen setup hooks` uses `axi-sdk-js` `installSessionStartHooks` to target Claude Code (`~/.claude/settings.json`), Codex (`~/.codex/hooks.json`), and OpenCode (`~/.config/opencode/plugins/axi-lumen.js`).
  - Ambient session context provides fast zero-arg orientation.

### 8. Content first (Home View)
- **Status**: ✅ PASS
- **Details**: Running `lumen` without arguments outputs identification headers (`bin`, `description`) and immediate actionable help hints rather than a full manual dump.

### 9. Contextual disclosure
- **Status**: ✅ PASS
- **Details**:
  - `chart` provides `help` strings when fallback occurs (e.g., house system fallback above polar circle).
  - Home view and subcommand error outputs provide direct, parameterized runnable commands.

### 10. Consistent way to get help & `--version` fast path
- **Status**: ✅ PASS
- **Details**:
  - `bin/lumen.ts` imports `tryFastPath` from `axi-sdk-js/fast-path` and `VERSION` from the leaf module `src/version.ts`, responding to `-v`, `-V`, `--version` immediately without evaluating the CLI graph.
  - Subcommand `--help` returns concise, dedicated flag usage (`chartUsage`).

---

## Artifact & Log Locations
- Audit Report: [.scratch/blindspot-audit/report.md](file:///home/erick/Projects/clis/lumen/.scratch/blindspot-audit/report.md)
- Web Report: [.lavish/audit-20260813.html](file:///home/erick/Projects/clis/lumen/.lavish/audit-20260813.html)

---

## Re-audit: 2026-08-15 (post-realignment T1–T3)

**Trigger**: SPEC §6.5 (auditoría AXI sin violaciones abiertas) — la superficie cambió con la remoción de synastry clásica, lots/stars y el traslado de eclipses a `soul --full`.

Superficie re-verificada en vivo (`bun run bin/lumen.ts`):

- **Home (content-first)**: `bin:`, `description:`, estado vivo (`agenda: 0 active consultations`, `clients: 0 clients found`) + `help[5]` con comandos accionables. ✅
- **Fast-path**: `-v` → `0.1.0` sin evaluar el grafo CLI. ✅
- **Errores estructurados**: `lumen synastry` → `error: "Unknown command: synastry"` + `code: VALIDATION_ERROR` + `help[1]` accionable; `classical chart --eclipses` → `error: "Unknown flag --eclipses for \`chart\`"` + lista de flags válidos (exit 2). ✅
- **`--help` consistente**: `classical --help` (chart|draconic only), `soul --help` (flags + defaults + ejemplo `--full`). ✅
- **TOON en stdout**: salidas sin decoración, colecciones compactas (`dispositorChains.pluto[3]{body,sign,ruler}`). ✅

Obsolescencias del reporte original (2026-08-13), superadas por esta sección:

- §2 ya no aplica `--eclipses`/`--lots`/`--stars` como flags opt-in del intake: solo `--evolutionary` queda en classical; los eclipses prenatales se entregan por `soul --full` (`evolutionaryMechanics.prenatalEclipses`).
- §5 idem: los campos opcionales de salida ahora son `evolutionary`, `draconic` (classical) y `prenatalEclipses` (soul --full).
- §10 refiere `chartUsage` del viejo `lumen chart`: la superficie de chart es `lumen classical chart|draconic` (andamiaje técnico), y `soul` es el reading evolutivo.

**Veredicto**: 10/10 PASS sobre la superficie de SPEC §3 post-realineación; sin violaciones abiertas.
