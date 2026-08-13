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
  2. If `request.options.draconic` is `true`:
     - Determine the reference North Node longitude $\lambda_{\text{node}}$.
       - If `request.options.node` is `'mean'`, use `chart.bodies.mean_node.lon`.
       - Otherwise (if `'true'` or `'both'`), default to `chart.bodies.true_node.lon`.
     - Shift all ecliptic longitudes by subtracting $\lambda_{\text{node}}$ modulo 360°:
       $$\lambda_{\text{draconic}} = (\lambda_{\text{natal}} - \lambda_{\text{node}} + 360) \pmod{360}$$
     - Apply this shift to:
       - Every body in `chart.bodies` (`lon`).
       - Every angle in `chart.angles` (`asc.lon`, `mc.lon`, `vertex.lon`, `eastPoint.lon`).
       - Every cusp in `chart.cusps` array (`lon`).
     - Recompute aspects between shifted longitudes (or maintain existing aspects as orbs/angular separations remain invariant under uniform rotation).
     - Annotate `chart.meta` with `draconic: true` and `draconicNodeUsed: 'true_node' | 'mean_node'`.

## Output & Formatting (`src/lib/output.ts`)

- Update projection logic if needed to display `draconic: true` in `chart.meta` and echo `draconic: true` in `birth.requested`.
- Ensure standard sign projection (`project`) correctly converts new longitudes into signs (e.g. `0.0000°` -> `Aries 0.0000°`).

## Test Plan

- Unit test in `src/lib/intake.test.ts`: verify parsing of `--draconic` flag.
- Unit test in `src/lib/compute.test.ts`:
  - Verify North Node longitude becomes `0°` Aries (`0.0000°` longitude).
  - Verify relative angular distances (aspects) between bodies remain identical to natal.
  - Verify all bodies, angles, and cusps shift by exact $\lambda_{\text{node}}$.
- E2E test in `src/commands/chart.test.ts`:
  - Run `chartCommand` with `--draconic` and verify formatted output contains `draconic: true` and projected 0° Aries North Node.
