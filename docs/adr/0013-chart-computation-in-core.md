# ADR-0013: Shared chart computation in core

## Status

Accepted

## Context

ADR-0012 moved the natal reading assembly into `src/core/reading.ts`. That made
the chart path deep, but journey and karma were left behind: their command
adapters still instantiated `CaelusEphemeris`, called `chartAt` by hand, copied
`ResolvedBirth` field-by-field, and hand-picked chart options. Journey even
hardcoded `houseSystem: "placidus"` and omitted `zodiac`/`bodies`/`topocentric`,
so its natal chart could diverge from `chart natal`. The true-node canon also
had multiple homes: `reading.ts` deleted `mean_node` for its path, while
`journey.ts` and `karma.ts` used `true_node ?? mean_node`.

## Decision

- **One deep module owns chart computation**: `src/core/charts.ts` exposes
  `chartAt(request: NatalRequest, jdUt: number, ephemeris: Ephemeris): Chart`.
  It applies the complete `ChartRequestOptions` (`houseSystem`, `zodiac`,
  `bodies`, `topocentric`) and deletes `mean_node` — the true-node canon.
- **One interface for every chart moment**: the same `chartAt` serves the natal
  chart (`jdUt = request.birth.jdUt`), progressed charts, and station charts.
  No separate `chartFor` convenience is needed; a single small interface is
  deeper than two wrappers.
- **The projection policy stays in `projection.ts`** (ADR-0011). `charts.ts`
  returns the raw caelus chart; it does not publish TOON values. Price of a
  clean seam: journey/karma still cross `projection.ts` when they need the
  published shape.
- **`reading.ts` uses `charts.chartAt`**: its private `chartFor` disappears and
  the true-node canon moves out of the reading assembly into the shared module.
- **Core journey/karma deepen their interfaces**:
  - `computeProgressions(request, targetJd, targetDateStr, ephemeris, bodyIds?, aspectOrb?)`
  - `computeStations(request, bodyId, ephemeris, window?, limit?)`
  - `computeKarma(idA, requestA, idB, requestB, ephemeris, orb?)`
  Each function obtains its own charts through `charts.chartAt`; callers no
  longer prepare `Chart` inputs.
- **Commands become pure AXI glue**: no `chartAt`, no manual `ResolvedBirth`
  reconstruction, no hand-picked options.

## Consequences

- The true-node canon has one home. `reading`, `journey`, and `karma` all see
  charts with `mean_node` removed; if a chart lacks `true_node`, the nodal axis
  is simply absent (no fallback).
- Journey and karma inherit the same chart options as `chart natal`: a config
  like `whole_sign` or `topocentric` no longer diverges between commands.
- `computeReading` keeps its public shape byte-identical; the internal
  `chartFor` is replaced by the shared `chartAt`.
- Tests: a fake `Ephemeris` in `tests/core/charts.test.ts` pins option
  propagation and the canon; core journey/karma tests move to the new
  request-based signatures.
- DOMAIN.md and docs/agents/domain.md tree gain `src/core/charts.ts`; SPEC §2
  counts 11 core modules.

## Alternatives

- **Export `chartFor` from `reading.ts`**: couples the deep reading assembly to
  a low-level access concern; every non-reading consumer would import from the
  reading module.
- **Let `charts.ts` also project**: creates a second TOON mapping site and
  violates the single-policy ADR-0011.
- **Keep journey/karma signatures receiving `Chart`**: commands remain the only
  place that knows how to obtain a chart — the shallow pattern this ADR closes.
