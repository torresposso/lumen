# CONTEXT.md

Domain glossary for lumen.

## Terms

- **Natal chart** — the base chart for one birth instant and place: body positions, house cusps, angles, and aspects, computed by the ephemeris engine.
- **Resolved birth** — a local birth time and place turned into a UT Julian Day plus timezone provenance (zone, offset, DST, status). Owned by `src/lib/intake.ts`.
- **Natal request** — the intake bundle for a natal chart: a resolved birth plus chart request options. Owned by `src/lib/intake.ts`.
- **Chart request options** — the chart-type-agnostic options: house system, zodiac, node selection, extra bodies, topocentric. Owned by `src/lib/intake.ts`.
- **Ephemeris engine** — the caelus engine that computes positions and charts; constructed inside the chart computation module (`src/lib/compute.ts`).
- **Chart computation** — turns a Natal request into a final Natal chart: builds the ephemeris engine, requests the chart, and applies the node selection. Owned by `src/lib/compute.ts`.
- **Chart projection** — the renderable output derived from a Natal chart: rounded longitudes, sign projections, aspects, and summary, plus the birth echo. Owned by `src/lib/output.ts`.

## Planned chart types (no module yet)

- **Draconic** — natal positions re-projected onto the lunar-node zodiac.
- **Synastry** — two natal charts overlaid (composes two resolved births).
- **Solar arc** — the natal chart progressed by the Sun's arc.

## Decisions

- **ADR-0001** — Zod at the intake seam, caelus types at the output (`docs/adr/0001-zod-at-intake-caelus-types-at-output.md`).
