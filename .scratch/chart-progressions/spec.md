# Spec — Chart Progressions (Lumen v2)

> Deliverable of the feature effort `.scratch/chart-progressions/`.
> Implementation of Secondary Progressions ("day-for-a-year") and the Progressed Sol-Luna Phase cycle over stored birth profiles.

## 1. Product

`lumen chart progressions <uuid> --when "YYYY-MM-DDTHH:MM±HH:MM"` reads a v2 birth profile by UUID from the local profile store and calculates secondary-progressed planetary positions, the 28-year Progressed Sol-Luna Phase, progressed house placements in the natal chart, and aspects from progressed planets to the natal chart using exact `caelus: "0.24.1"` ephemerides.

The calculation is deterministic:
- `--when` is required: ISO 8601 datetime with explicit UTC offset (`YYYY-MM-DDTHH:MM±HH:MM` or `…Z`).
- Calculates `progressedJd = natalJd + (targetJd - natalJd) / 365.24219`.

## 2. Output Data Model

A single root object with key `progressions`:

```typescript
export interface ProgressedChartOutput {
  target: {
    dateTime: string;
    jdUt: number;
    ageYears: number;
    progressedJdUt: number;
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
  solLunaPhase: {
    phase: string;
    angle: number;
    description: string;
  };
  progressedBodies: Record<string, ProgressedBody>;
  aspectsToNatal: ProgressedAspect[];
  evolutionaryTriggers: {
    plutoContacts: ProgressedAspect[];
    pppContacts: ProgressedAspect[];
    nodalContacts: ProgressedAspect[];
    skippedStepActivations: ProgressedSkippedStepActivation[];
  };
  method: string;
}

export interface ProgressedBody {
  name: string;
  lon: number;
  lat: number;
  dec: number;
  speed: number;
  retrograde: boolean;
  sign: string;
  signDeg: number;
  natalHouse: number;
  outOfBounds: boolean;
}

export interface ProgressedAspect {
  progressedBody: string;
  natalPoint: string;
  aspect: string;
  orb: number;
  maxOrb: number;
  isApplying: boolean;
  stress: "stressful" | "nonstressful";
}

export interface ProgressedSkippedStepActivation extends ProgressedAspect {
  skippedStepBody: string;
  resolutionNode: "north" | "south";
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
- Returns AXI `NOT_FOUND` if the UUID does not match any profile.
- Output is rendered deterministically in TOON format with 2-space indentation.

## 4. Astrological Calculation Canon

- **Ephemerides**: Exact `caelus: "0.24.1"`.
- **Zodiac**: Tropical.
- **Progression Rate**: 1 tropical year of life = 1 ephemeris day of motion (`TROPICAL_YEAR = 365.24219`).
- **Progressed Orbs**: Strict tight orbs for progressed-to-natal contacts (max 1.0° orb).
- **Sol-Luna Phase**: The archetypal 8-phase cycle of the Progressed Sun and Progressed Moon (New, Crescent, First Quarter, Gibbous, Full, Disseminating, Last Quarter, Balsamic).

## 5. Ephemeris Seam

Uses `EphemerisGateway` (`src/adapters/ephemeris.ts`) wrapping Caelus `Engine.chartAt`, `progressedLongitude`, `progressedJd`.

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
