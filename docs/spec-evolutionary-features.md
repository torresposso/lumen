# SPEC: Evolutionary Astrology Features (`--eclipses`, `--lots`, `--stars`)

> **Nota de implementación (refactor modular)**: la entrada de flags vive en `src/commands/client.ts`; eclipses/lots/estrellas en `src/core/classical.ts`; la salida del comando `chart` en `src/commands/classical.ts`. Las rutas `src/lib/*` de abajo son históricas del diseño original.
## Summary
Add optional flags to `lumen chart` to enrich natal and draconic readings with evolutionary features:
- `--eclipses`: Prenatal solar and lunar eclipses immediately preceding birth.
- `--lots`: Hermetic Lots (Lot of Spirit, Lot of Fortune).
- `--stars`: Fixed Star conjunctions with natal bodies and angles (orb <= 1.5°).

## Schema & Intake (`src/lib/schema.ts`, `src/lib/intake.ts`)

- Update `optionsSchema`:
  - `eclipses: z.boolean().default(false)`
  - `lots: z.boolean().default(false)`
  - `stars: z.boolean().default(false)`
- Update `chartFlagSpec.boolean`: add `'eclipses'`, `'lots'`, `'stars'`.
- Update `ChartRequestOptions` type interface and `parseRequested` in `src/lib/intake.ts`.

## Computation (`src/lib/compute.ts`)

### 1. Prenatal Eclipses (`--eclipses`)
- Search window: `[jdUt - 180, jdUt]` (180 days prior to birth).
- Call `caelus/eclipses` functions (`solarEclipses`, `lunarEclipses`).
- Take the last solar and last lunar eclipse before `jdUt`.
- Determine ecliptic longitude of Sun (for solar eclipse) or Moon (for lunar eclipse) at `tMax`.
- Project into zodiac sign, signDeg, and determine natal house.

### 2. Hermetic Lots (`--lots`)
- Call `caelus/lots` (`lots(engine, jdUt, lat, lon)`).
- Calculate `spirit` (Lot of Spirit) and `fortune` (Lot of Fortune).
- Project longitudes into sign, signDeg, and determine natal house.

### 3. Fixed Stars (`--stars`)
- Iterate over major fixed stars in `caelus/stars` data catalog.
- Compare star ecliptic longitude with natal bodies and angles.
- If angular distance $|\lambda_{\text{body}} - \lambda_{\text{star}}| \le 1.5^\circ$, record conjunction.

## Output & Formatting (`src/lib/output.ts`)

- Extend `Projection` interface with optional fields:
  - `eclipses?: { solar?: EclipseProjection; lunar?: EclipseProjection }`
  - `lots?: { spirit?: LonProjection & { house: number }; fortune?: LonProjection & { house: number } }`
  - `stars?: Array<{ star: string; body: string; orb: number; sign: string }>`

## Test Plan

- Unit test in `src/lib/intake.test.ts`: verify parsing of `--eclipses`, `--lots`, `--stars` flags.
- Unit test in `src/lib/compute.test.ts`:
  - Verify prenatal eclipses are returned before birth JD.
  - Verify Lot of Spirit and Lot of Fortune calculations.
  - Verify star conjunction matching when enabled.
- E2E test in `src/commands/chart.test.ts`:
  - Run `chartCommand` with `--eclipses --lots --stars` and verify non-empty fields in result.
