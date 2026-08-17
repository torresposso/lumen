# ADR-0010: Evo publication assembled in one source (core)

## Status

Accepted

## Context

The architecture review of `src/commands/chart.ts` (Candidate 1) found the
`evo` block assembled in a 188-LOC private `AstrologicalEngine.buildEvo`
method that:

1. Serialized three core computators (`computeSoulReading`,
   `computeNodalReading`, `computePrenatalEclipses`) into both the `EvoOutput`
   publication shape and the `EvoAtomsInput` shape, mapping the same fact into
   two parallel literals (e.g. `soul.pluto.aspects.length` became
   `EvoOutput.counts.plutoAspects`, `EvoOutput.pluto.aspects`, and
   `EvoAtomsInput.plutoAspectCount`).
2. Was the only site in `core`/`commands` that threw `AxiError`, breaking the
   ADR-0001 seam rule (core never throws AxiError; the CLI seam does).
3. Defined `EvoOutput` / `EvoNodalPoint` / `EvoNodalAxis` publication shapes in
   `commands/` despite being pure publication, and hid a type mismatch behind an
   inline `rulerPlacement` helper whose only job was to strip `description` from
   `NodalRulerPlacement`.

ADR-0009 already moved the evo *criteria* (`describeEvoCriteria`,
`plutoNorthNodeSeparation`) into core. The remaining drift source is the
*publication shape* itself: the assembly knows the exact shape of both
`EvoOutput` and `EvoAtomsInput` and must stay in lockstep with the computators
that feed it.

## Decision

- **One deep module owns the evo publication**: `src/core/evolutionary-reading.ts`
  exposes `computeEvolutionaryReading(input): EvolutionaryReading | undefined`.
  It moves the `EvoOutput`, `EvoNodalPoint`, and `EvoNodalAxis` types next to
  the computators and atoms that consume them. `commands/chart.ts` shrinks by
  ~220 LOC (the method and the moved interfaces).
- **`T | undefined`, not a discriminated union**: the return type follows the
  `core/` convention (`computeSoulReading`, `computeNodalReading`) — `undefined`
  signals missing input (no pluto, or no nodal axis). No union wrapper.
- **`ephemeris` is a parameter** (`Ephemeris` from `core/types.ts`), a real seam:
  production passes `CaelusEphemeris`, tests pass a mock. The module never
  instantiates an ephemeris internally.
- **AxiError stays at the seam**: `core` returns `undefined`; `AstrologicalEngine.compute`
  translates the `undefined` (missing-input) branch into `AxiError(
  "Could not compute evolutionary mechanics", "CALCULATION_ERROR", [...])`.
  SPEC §2 ("core never throws AxiError") holds by construction.
- **Inline `rulerPlacement` helper deleted**: `EvoNodalPoint.rulerPlacement`
  (the new TOON type) omits `description`; `NodalRulerPlacement` (core) keeps it
  for any other reader. The agent reads only structured fields, so the published
  shape drops the string (decision 5 of the review). Output is byte-identical to
  `main` because the helper was already stripping `description`.
- **Compute is internal**: `computeEvolutionaryReading` calls the three core
  computators itself; the command layer only forwards inputs and pushes the
  returned `atoms` into the interpretation context.
- **Single file, mechanical move**: no behavior change; `check:docs` parity
  (doc↔code tree + surface) is preserved because no new `src/` file changes the
  documented surface beyond the move.

## Consequences

- Locality: the evo output shape and atoms shape live beside the computators
  that feed them; a field rename surfaces at one site.
- Test depth: `tests/core/evolutionary-reading.test.ts` assembles the evo block
  directly (catching mapping typos the coarser engine tests missed) and covers
  the `undefined` missing-input branch. Engine-level tests still pass through
  `AstrologicalEngine.compute`.
- The only `AxiError` throw in the engine moves to `compute` (the seam),
  restoring SPEC §2 for `core/`.
- `buildEvo` and its inline helper are gone; `chart.ts` keeps only AXI glue
  (`usageFor` / `applyMode` / `resolveRequest` / `parseEvoFlag` / `chartCommand`).

## Alternatives

- Keep `buildEvo` in `commands/` and only extract the interfaces: keeps the
  double-mapping and the broken locality; the review's friction (1) remains.
- Discriminated-union return: rejected — core convention is `T | undefined`, and
  a union adds a caller-side branch with no benefit here.
- Keep `description` in the published `rulerPlacement`: rejected — it is read by
  no consumer in the engine or output, so publishing it is dead payload.
