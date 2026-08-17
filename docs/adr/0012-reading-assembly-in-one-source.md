# ADR-0012: Natal reading assembly in one source (core)

## Status

Accepted

## Context

ADR-0010 moved the `evo` publication into `src/core/evolutionary-reading.ts`
and ADR-0011 moved the chart projection into `src/core/projection.ts`. Both
times `AstrologicalEngine.compute` in `src/commands/chart.ts` shrank but kept
the *assembly* of the natal reading itself: it computed the raw chart, decided
the draconic projection, cleaned the true-node canon, called `project()` and
`computeEvolutionaryReading()`, built the `help` strings, merged the
interpretation atoms, and assembled the `AstrologicalReading` publication —
~90 LOC of orchestration living in the commands layer.

Two drifts remained:

1. **The true-node canon was split in two.** The command deleted `mean_node`
   from the bodies before `project()`, but the `evo` block received the raw body
   set and depended on `NON_PLANETARY_IDS` (aspect matching in `soul.ts`) plus
   the `bodies.true_node ?? bodies.mean_node` fallback in `nodes.ts`. Two
   mechanisms answering "which node does lumen publish?"
2. **The publication shape lived at the seam.** `AstrologicalReading`,
   `BirthEcho`, and `ChartOutputSelection` were still defined in
   `commands/chart.ts`, and the class `AstrologicalEngine` instantiated its own
   default ephemeris (`new CaelusEphemeris()`) — the one thing SPEC §2 forbids
   core from doing, and the one abstraction the rest of `core/` had abandoned
   in favor of pure `computeX(input, ephemeris)` functions.

## Decision

- **One deep module owns the natal reading assembly**:
  `src/core/reading.ts` exposes
  `computeReading(request: NatalRequest, ephemeris: Ephemeris, selection?: ChartOutputSelection): AstrologicalReading | undefined`
  — a pure function, no class, `Ephemeris` by parameter like every other core
  computator. `AstrologicalEngine` dissolves; `AstrologicalReading`,
  `BirthEcho`, and `ChartOutputSelection` move next to the function.
- **The reading is a self-contained publication**: `computeReading` fills
  `help` (the three deterministic advisory strings — house-system fallback,
  omitted bodies, timezone provenance), exactly as today including
  `help: undefined` when there is nothing to report. Precedent: ADR-0009 core
  already emits formatted presentation (`method`, `formatted`, `description`).
- **`T | undefined`, not a throw**: if `selection.evo` is set and the chart
  lacks pluto or the true node, `computeEvolutionaryReading` returns
  `undefined`, so `computeReading` returns `undefined` (the core convention,
  ADR-0010) and `chartCommand` translates it into the existing `AxiError`.
- **The true-node canon is cleaned once**: `computeReading` deletes
  `mean_node` from the bodies and passes the *same cleaned set* to both
  `project()` and `computeEvolutionaryReading()`. Byte-identical: the CLI
  guard guarantees the true node is present, and `NON_PLANETARY_IDS` already
  filtered it from aspect matching. The `true_node ?? mean_node` fallback in
  `nodes.ts` stays for `karma.ts` and `journey.ts`, which read charts they own;
  on the natal path it becomes unreachable (documented in a comment).
- **`commands/chart.ts` keeps only AXI glue**: parsing, usage routing,
  `resolveRequest`, `parseEvoFlag`, `applyMode`, `chartCommand`, and the
  adapter instantiation. It stops exporting types; nothing outside imports
  them. The published reading passes through untouched.
- **The atoms merge moves into core**: the
  `interpretationContext.atoms.push(...evo.atoms)` step assembles inside
  `computeReading`, beside the generators. `generateFactAtoms` /
  `FactAtomsInput` are left as-is (the typing tightening is a separate review).

## Consequences

- The assembly, the canon decision, the help strings, and the publication types
  have one home; a field rename or canon change surfaces at one site.
- `commands/chart.ts` shrinks to parsing plus a 6-line seam; the only logic it
  keeps is the `AxiError` translation, per ADR-0001/ADR-0010. This supersedes
  the ADR-0011 consequence that "the engine keeps `AstrologicalEngine`,
  `AstrologicalReading`, `BirthEcho`, the `mean_node` deletion" — the engine no
  longer exists.
- No byte change: the base chart, the `evo` block, `help`, the draconic
  section, and `interpretationContext` are byte-identical to the class
  implementation (same rounders, same assembly order, same merge).
- Tests: `tests/core/astrological-engine.test.ts` and
  `tests/core/output-projection.test.ts` are ported to `computeReading` with
  their byte-pins intact; two new pins cover the `undefined` contract and the
  single-canon guarantee. Status quo for `tests/commands/*`.
- DOMAIN.md and docs/agents/domain.md tree gain `core/reading.ts`; SPEC §2
  counts 10 core modules (parity stays green).

## Alternatives

- **Keep the class, move it to core**: reintroduces the default-adapter
  instantiation SPEC §2 forbids and keeps a one-field object with no depth.
- **Let the command derive `help` from the published fields**: splits the
  publication across the seam; the reading stops being self-contained and the
  `tests/core` pins would have to move.
- **Throw inside core when evo is missing**: violates the ADR-0010 convention
  (`T | undefined`) and SPEC §2 ("core never throws AxiError").
- **Keep passing raw bodies to evo**: leaves the canon split in two mechanisms
  that this module exists to close, at the cost of a documented exception.