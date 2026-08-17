# ADR-0011: Chart projection and the TOON precision policy in one source (core)

## Status

Accepted

## Context

`src/commands/chart.ts` still owned the chart *publication*: `projectBodies`,
`projectDraconicBodies`, `projectAngles`, `renderLon`, and `project` (~106 LOC)
mapped a raw caelus `Chart` into the published `lon`/`sign`/`signDeg`/`house`
shape, rounding coordinates to 4 dp and speed to 6 dp. That rounding was the
ad-hoc pattern ADR-0008 named ("`projectBodies` … Core queda crudo"), but since
ADR-0010 moved the `evo` publication into `src/core/evolutionary-reading.ts`,
the phrase is hollow: the policy now lives at three call sites with no single
home.

The drift is real:

1. `evo` rounds its own `lon`/`signDeg` inline, while
   `rulerPlacement.signDeg` arrives already 4 dp from core
   (`computeNodalRuler` in `nodes.ts`) but *unnamed* — the publication never
   says where that precision came from.
2. `journey progressed` emits `lon`/`signDeg` **raw** (never rounded).
3. `renderLon(number | { lon })` carries a dead union arm: `Chart.cusps` is
   `number[]` and `Chart.angles` are numbers — nothing ever passes an object.
4. Precision decisions (4 dp vs 6 dp vs 2 dp for `ppp.separation`) are scattered
   facts, re-derived at each site instead of named once.

## Decision

- **One deep module owns the chart projection**: `src/core/projection.ts`
  exposes `project(input): Projection` — the full published chart (bodies,
  draconic, angles, cusps, aspects, meta) — and the published shape types
  `Projection` / `LonProjection` / `AspectProjection` / `DraconicProjection` /
  `DraconicBodyProjection`, moved from `commands/chart.ts`. It is pure
  data-in/data-out: no I/O, no `AxiError`.
- **Named precision policy** in the same module: constants
  `TOON_LON_DIGITS(4)`, `TOON_SPEED_DIGITS(6)`, `TOON_ORB_DIGITS(4)`,
  `TOON_STRENGTH_DIGITS(3)`, `TOON_SEPARATION_DIGITS(2)` and helpers
  `roundToon` / `roundSpeed` / `roundOrb` / `roundStrength` / `roundSeparation`
  delegating to `roundPrecision`. Every published number either crosses a helper
  or reads the named constant (angles and cusps call `projectPoint` with
  `TOON_LON_DIGITS`) — there is exactly one place where a precision decision is
  made.
- **`commands/chart.ts` stops projecting**: `AstrologicalEngine.compute` calls
  `project()`; the engine keeps `AstrologicalEngine`, `AstrologicalReading`,
  `BirthEcho`, the `mean_node` deletion (true-node canon is engine policy), the
  help merge, and the `AxiError` at the seam (ADR-0001 / ADR-0010). The moved
  types are not re-exported from `commands/chart.ts` — nothing imports them.
- **`evolutionary-reading.ts` and `journey.ts` route through the policy**:
  `evo` uses `roundToon`/`roundSeparation` at its existing call sites, and
  `rulerPlacement.signDeg` is explicitly routed through `roundToon` too — its
  value was already 4 dp in core (`nodes.ts`), so this *names* the policy, it is
  not a byte fix; `journey progressed` rounds `lon`/`signDeg` to 4 dp
  (previously raw — nothing pinned it).
- **Seam collapse**: the `renderLon(number | { lon })` union becomes
  `projectLon(rawLon: number)`; cusp and angle callers pass numbers.
- **`classical.ts` keeps the computations**: `computeDeclinationAspects`,
  `computeChartSignature`, and `detectAspectPatterns` stay where they are; the
  projection module *calls* them (core→core dependency, no cycle).

## Consequences

- One home for both the mapping and the policy; a precision change is one edit
  in one file, not three call sites.
- Byte change only where the policy was violated: `journey progressed`
  `lon`/`signDeg` (previously raw → now 4 dp). `rulerPlacement.signDeg` moves
  from an implicit 4 dp in core to an explicit route through the policy —
  byte-identical. The base chart output is byte-identical too (same rounders,
  same digits; angles and cusps read `TOON_LON_DIGITS`).
- `commands/chart.ts` shrinks by the projection surface; DOMAIN.md and
  docs/agents/domain.md tree gain `core/projection.ts` (parity stays green).
- Tests: `tests/core/projection.test.ts` asserts the policy table and the direct
  mapping; the existing through-engine byte-pins stay; journey/evo gain 4 dp
  pins.

## Alternatives

- **Policy helpers only** (keep `project()` in `commands/chart.ts`): leaves two
  answers to "where is the chart published", the exact split this deepens past.
- **Keep `journey progressed` raw**: re-lays the three-policy trap the module
  exists to close, at the cost of a documented exception forever.
- **Round inside core computations**: contaminates the pure calculation and
  re-opens the question ADR-0008 already settled ("core queda crudo").