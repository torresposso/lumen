# SPEC: Draconic Chart Support (`--draconic`)

## Summary
Add support for computing and rendering Draconic charts in `lumen`. A Draconic chart shifts all natal longitudes (bodies, angles, and house cusps) so that the North Lunar Node aligns with 0° Aries (`0.0000°` longitude).

## User Interface & CLI Intake

- New boolean flag: `--draconic` (or `--draconic=true`).
- Accepted in `lumen chart` command.
- Compatible with all existing options (`--house-system`, `--zodiac`, `--node`, `--bodies`, `--topocentric`).

### Flag specification & Schema updates
- Update `src/lib/schema.ts`:
  - Add `draconic?: boolean` to `ChartRequestOptionsSchema`.
  - Add `'draconic'` to `chartFlagSpec.booleans`.
- Update `src/lib/intake.ts`:
  - Extract `draconic` boolean flag in `resolveNatalRequest` and include it in `requested` options.

## Computation (`src/lib/compute.ts`)

- In `computeChart(request)`:
  1. Compute the base natal chart using Caelus engine as usual.
  2. Compute extensions (eclipses, lots, stars) and the evolutionary reading against the **natal** chart, never against the draconic projection.
  3. If `request.options.draconic` is `true`:
     - Determine the reference North Node longitude $\lambda_{\text{node}}$.
       - If `request.options.node` is `'mean'`, use `chart.bodies.mean_node.lon`.
       - Otherwise (if `'true'` or `'both'`), default to `chart.bodies.true_node.lon`.
     - Shift all ecliptic longitudes by subtracting $\lambda_{\text{node}}$ modulo 360°:
       $$\lambda_{\text{draconic}} = (\lambda_{\text{natal}} - \lambda_{\text{node}} + 360) \pmod{360}$$
     - Apply this shift to:
       - Every body in `chart.bodies` (`lon`).
       - Every angle in `chart.angles` (`asc.lon`, `mc.lon`, `vertex.lon`, `eastPoint.lon`).
       - Every cusp in `chart.cusps` array (`lon`).
     - Expose the projection as a **separate** `chart.draconic` section — do NOT overwrite the natal bodies, angles, or cusps. Recompute aspects between shifted longitudes (or maintain existing aspects as orbs/angular separations remain invariant under uniform rotation).

## Output & Formatting (`src/lib/output.ts`)

- The natal chart remains the primary output. When `--draconic` is enabled, a `chart.draconic` object is added alongside it:
  - `nodeUsed`: `'true_node' | 'mean_node'` (which node anchored the shift).
  - `bodies`, `angles`, `cusps`: the draconic projections, with the North Node at 0° Aries.
- Echo `draconic: true` in `birth.requested`.

## Test Plan

- Unit test in `src/lib/intake.test.ts`: verify parsing of `--draconic` flag.
- Unit test in `src/lib/compute.test.ts`:
  - Verify the natal chart is preserved (North Node stays at its natal longitude).
  - Verify the `chart.draconic` section exposes the North Node at 0° Aries (`0.0000°` longitude).
  - Verify relative angular distances (aspects) between bodies remain identical to natal.
  - Verify all draconic bodies, angles, and cusps shift by exact $\lambda_{\text{node}}$.
- E2E test in `src/commands/chart.test.ts`:
  - Run `chartCommand` with `--draconic` and verify formatted output contains a `draconic` section with `nodeUsed` and a projected 0° Aries North Node.
