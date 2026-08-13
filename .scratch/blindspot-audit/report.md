# Deep Blindspot Audit Report (`lumen`)

**Date**: 2026-08-13
**Tool**: `codegraph` MCP & `lumen` static analysis

---

## CodeGraph AST & Call Graph Summary
- **Nodes indexed**: 230 nodes across 51 files.
- **Edges indexed**: 671 edges.
- **Entrypoints tracked**: `bin/lumen.ts` -> `src/cli.ts` -> `resolveNatalRequestFromArgs` & `computeChart` & `formatChart`.

---

## Identified Blindspots & Mitigations

### 1. [RESOLVED] Evolutionary Module Node Resolution Order
- **Blindspot**: In `src/core/chart-engine.ts`, `DROPPED_BY_NODE` was previously executed *before* `computeEvolutionaryReading`. When `--node mean` was passed, `true_node` was deleted from `result.bodies`. Because `computeEvolutionaryReading` looked for `bodies.true_node ?? bodies.mean_node`, it would fallback to `mean_node` even if the user meant to evaluate `true_node` before dropping it from the outer projection.
- **Fix**: Reordered execution in `AstrologicalAnalysis.analyze` so `computeEvolutionaryReading` runs prior to deleting unrequested nodes from `result.bodies`.

### 2. [VERIFIED] Geocoding Network Timeout Handling
- **Blindspot**: `mergeBirthInput` in `src/cli/intake.ts` handles network failures during `--place` lookup. `Promise.race` is wrapped with a 5s timeout that converts raw network/abort exceptions into structured `AxiError` (`NETWORK_ERROR`), satisfying AXI non-leaking errors.

### 3. [VERIFIED] Draconic Shift Null Safety
- **Blindspot**: `toDraconicChart` in `src/core/draconic.ts` checks for `nodeLon === undefined` and raises a clean `AxiError("INVALID_VALUE")` if neither `true_node` nor `mean_node` is found, protecting downstream zodiac angle shifts.

### 4. [VERIFIED] Flag Vocabulary Symmetry
- **Blindspot**: `chartFlagSpec` in `src/cli/schema.ts` is derived dynamically via `deriveFlagSpec([birthSchema, optionsSchema], ...)` ensuring flag validation and Zod schema parsing can never drift out of sync.

---

## Status
All 76 unit tests pass cleanly. `codegraph` index is active at `.codegraph/`.
