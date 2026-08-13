# SPEC: Evolutionary Astrology Module (`--evolutionary`)

## Summary
Add `--evolutionary` boolean flag to `lumen chart` to compute the Jeffrey Wolf Green evolutionary triad:
- Pluto natal placement & directionality (Direct, Retrograde).
- Pluto Polarity Point (PPP) at $\lambda_{\text{Pluto}} + 180^\circ$ (Sign, Degree, House).
- Lunar Node axis: North Node & South Node ($\lambda_{\text{NorthNode}} + 180^\circ$) with Sign, Degree, House, and Ruling Planets.
- Skipped Steps: detection of planets forming squares ($90^\circ \pm 5^\circ$) to the Lunar Node axis or Pluto.

## Schema & Intake (`src/lib/schema.ts`, `src/lib/intake.ts`)
- Add `evolutionary: z.boolean().default(false)` to `optionsSchema`.
- Add `'evolutionary'` to `chartFlagSpec.boolean`.
- Update `ChartRequestOptions` interface and `parseRequested` in `src/lib/intake.ts`.

## Computation (`src/lib/compute.ts`)
- Compute `polarityPoint` for Pluto.
- Compute `southNode` from active `northNode` (true_node or mean_node).
- Identify sign rulers for North Node and South Node.
- Scan for `skippedSteps` (bodies squaring North Node, South Node, or Pluto within 5° orb).

## Output & Projection (`src/lib/output.ts`)
- Append `evolutionary` block to output chart object when `--evolutionary` is true.

## Test Plan
- Intake test in `src/lib/intake.test.ts`.
- Computation unit test in `src/lib/compute.test.ts`.
- End-to-end command test in `src/commands/chart.test.ts`.
