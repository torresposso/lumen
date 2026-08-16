# SPEC: Evolutionary Astrology Module (`--evolutionary`)

> **Nota de implementación (refactor modular)**: la entrada de flags vive en `src/commands/intake.ts`; el cálculo evolutivo en `src/core/soul.ts` y `src/core/nodes.ts`; la salida del comando `chart` en `src/commands/classical.ts`. Las rutas `src/lib/*` de abajo son históricas del diseño original.
## Summary
Add `--evolutionary` boolean flag to `lumen chart` to compute the Jeffrey Wolf Green evolutionary triad:
- Pluto natal placement & directionality (Direct, Retrograde).
- Pluto Polarity Point (PPP) at $\lambda_{\text{Pluto}} + 180^\circ$ (Sign, Degree, House).
- Lunar Node axis: North Node & South Node ($\lambda_{\text{NorthNode}} + 180^\circ$) with Sign, Degree, House, and Ruling Planets.
- Skipped Steps: detection of planets forming squares to the Lunar Node axis. Planets square only to Pluto are classified as Pluto aspects, not skipped steps.

## Schema & Intake (`src/lib/schema.ts`, `src/lib/intake.ts`)
- Add `evolutionary: z.boolean().default(false)` to `optionsSchema`.
- Add `'evolutionary'` to `chartFlagSpec.boolean`.
- Update `ChartRequestOptions` interface and `parseRequested` in `src/lib/intake.ts`.

## Computation (`src/lib/compute.ts`)
- Compute `polarityPoint` for Pluto.
- Compute `southNode` from active `northNode` (true_node or mean_node).
- Identify sign rulers for North Node and South Node.
- Scan for `skippedSteps` (bodies squaring the North Node/South Node axis).

## Output & Projection (`src/lib/output.ts`)
- Append `evolutionary` block to output chart object when `--evolutionary` is true.

## Test Plan
- Intake test in `src/lib/intake.test.ts`.
- Computation unit test in `src/lib/compute.test.ts`.
- End-to-end command test in `src/commands/chart.test.ts`.
