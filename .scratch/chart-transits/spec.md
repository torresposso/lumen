# Spec — Chart Transits (Lumen v2)

> Deliverable of the feature effort `.scratch/chart-transits/`.
> Implementation of Planetary Transits and JWGEA evolutionary triggers over stored birth profiles.

## 1. Product

`lumen chart transits <uuid> --when "YYYY-MM-DDTHH:MM±HH:MM" [--where "lat, lon, Place"]` reads a v2 birth profile by UUID from the local profile store and calculates planetary transits, house placements in the natal chart, local transit angles/cusps (if `--where` is given), inter-chart aspects (strict canonical orbs, applying/separating status), and JWGEA evolutionary triggers (contacts to natal Pluto, PPP, Nodal Axis, and Skipped Steps) using exact `caelus: "0.24.1"` ephemerides.

The calculation is deterministic:
- `--when` is required: ISO 8601 datetime with explicit UTC offset (`YYYY-MM-DDTHH:MM±HH:MM` or `…Z`).
- `--where` is optional: `"lat, lon, Place"`. When omitted, `transitAngles`, `transitCusps`, and `localHouse` in `transitingBodies` are `null`.

## 2. Output Data Model

A single root object with key `transits`:

```typescript
export interface TransitChartOutput {
  target: {
    dateTime: string;
    jdUt: number;
    place?: string | null;
    lat?: number | null;
    lon?: number | null;
  };
  natal: {
    id: string;
    name?: string | null;
    birthPlace: string;
    birthDateTime: string;
    birthLat: number;
    birthLon: number;
    birthJdUt: number;
  };
  zodiac: "tropical";
  houseSystem?: "porphyry" | null;
  transitingBodies: Record<string, TransitBody>;
  transitAngles?: TransitAngleProjections | null;
  transitCusps?: TransitCuspProjection[] | null;
  aspectsToNatal: TransitAspect[];
  evolutionaryTriggers: TransitEvolutionaryTriggers;
  outOfBounds: string[];
  method: string;
}

export interface TransitBody {
  name: string;
  lon: number;
  lat: number;
  dec: number;
  speed: number;
  retrograde: boolean;
  sign: string;
  signDeg: number;
  natalHouse: number;
  localHouse?: number | null;
  outOfBounds: boolean;
}

export interface TransitAspect {
  transitBody: string;
  natalPoint: string;
  aspect: string;
  orb: number;
  maxOrb: number;
  isApplying: boolean;
  stress: "stressful" | "nonstressful";
}
```

## 3. CLI Contract

```
lumen profile add --when "YYYY-MM-DDTHH:MM±HH:MM" --where "lat, lon, Place" [--name <slug>]
lumen profile list
lumen profile get <uuid>
lumen profile delete <uuid>
lumen chart natal <uuid>
lumen chart transits <uuid> --when "YYYY-MM-DDTHH:MM±HH:MM" [--where "lat, lon, Place"]
lumen chart progressions <uuid> --when "YYYY-MM-DDTHH:MM±HH:MM"
```

Rules:
- Accepts exactly one positional UUID (or unique prefix).
- Requires `--when` (fails with `VALIDATION_ERROR` if missing or malformed).
- Accepts optional `--where` (fails with `VALIDATION_ERROR` if malformed coordinates).
- Returns AXI `NOT_FOUND` if the UUID does not match any profile.
- Output is rendered deterministically in TOON format with 2-space indentation.

## 4. Astrological Calculation Canon

- **Ephemerides**: Exact `caelus: "0.24.1"`.
- **Zodiac**: Tropical.
- **Houses**: Porphyry for local transit houses (when `--where` is given) and natal house projections.
- **Transit Orbs**: Strict canonical evolutionary orbs:
  - Luminares and inner planets (Sun through Mars): 1.5° max orb.
  - Social and transpersonal planets (Jupiter through Pluto, True Node, True Lilith): 2.5° max orb.
- **Aspect State**: Applying vs separating dynamically determined via celestial speeds.
- **Evolutionary Triggers**:
  - `plutoContacts`: Aspects to natal Pluto.
  - `pppContacts`: Aspects to natal Pluto Polarity Point (if active).
  - `nodalContacts`: Aspects to natal North Node and South Node.
  - `skippedStepActivations`: Aspects activating natal skipped steps, including `resolutionNode`.
  - `dispositorActivations`: Aspects to final dispositors or mutual reception bodies.

## 5. Ephemeris Seam

Uses `EphemerisGateway` (`src/adapters/ephemeris.ts`) wrapping Caelus `Engine.chartAt`.

## 8. Source Layout

```
bin/lumen.ts
src/cli.ts
src/version.ts
src/commands/profile.ts
src/commands/chart.ts
src/cli/args.ts
src/cli/surface.ts
src/cli/subcommand.ts
src/domain/model.ts
src/domain/store.ts
src/domain/datetime.ts
src/domain/birth-input.ts
src/domain/transit-input.ts
src/domain/toon.ts
src/engine/shared/geometry.ts
src/engine/shared/rulers.ts
src/engine/shared/aspects.ts
src/engine/shared/natal-points.ts
src/engine/natal/types.ts
src/engine/natal/pluto-polarity.ts
src/engine/natal/nodal.ts
src/engine/natal/soul-lots.ts
src/engine/natal/phases.ts
src/engine/natal/eclipses.ts
src/engine/natal/patterns.ts
src/engine/natal/index.ts
src/engine/transits/types.ts
src/engine/transits/triggers.ts
src/engine/transits/aspects.ts
src/engine/transits/index.ts
src/engine/progressions/types.ts
src/engine/progressions/index.ts
src/storage/schema.ts
src/storage/profile-store.ts
src/adapters/ephemeris.ts
```
