# Spec — Chart Transits (Lumen v2)

> Deliverable of the feature effort `.scratch/chart-transits/`.
> Implementation of the transits chart calculation and JWGEA evolutionary triggers over stored birth profiles.

## 1. Product

`lumen chart transits <uuid> --when "YYYY-MM-DDTHH:MM±HH:MM" [--where "lat, lon, Place"]` reads a v2 birth profile by UUID from the local profile store and calculates planetary transits at the target instant, their geometric and aspect relationships to the natal chart, and JWGEA evolutionary trigger mechanics using exact `caelus: "0.24.1"` ephemerides.

The calculation is deterministic:
- `--when` is required: ISO 8601 datetime with explicit UTC offset (`YYYY-MM-DDTHH:MM±HH:MM` or `…Z`).
- `--where` is optional: if provided (`"lat, lon, Place"`), local transit houses and angles (Ascendant, Midheaven, Vertex, East Point) are computed; if omitted, only transiting celestial bodies and their projections onto the natal chart are computed.

## 2. Output Data Model

A single root object with key `transits`:

```typescript
export interface TransitChartOutput {
  target: {
    dateTime: string;
    jdUt: number;
    place?: string;
    lat?: number;
    lon?: number;
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
  houseSystem?: "porphyry";
  transitingBodies: Record<string, TransitBody>;
  transitAngles?: {
    asc: AnglePoint;
    mc: AnglePoint;
    vertex: AnglePoint;
    eastPoint: AnglePoint;
  };
  transitCusps?: HouseCusp[];
  aspectsToNatal: TransitAspect[];
  evolutionaryTriggers: {
    plutoContacts: TransitAspect[];
    pppContacts: TransitAspect[];
    nodalContacts: TransitAspect[];
    skippedStepActivations: SkippedStepTransitActivation[];
    dispositorActivations: TransitAspect[];
  };
  outOfBounds: string[];
  method: string;
}

export interface TransitBody {
  name: string;
  longitude: number;
  latitude: number;
  declination: number;
  speed: number;
  isRetrograde: boolean;
  sign: string;
  degreeInSign: number;
  natalHouse: number;
  localHouse?: number;
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

export interface SkippedStepTransitActivation {
  transitBody: string;
  skippedStepBody: string;
  aspect: string;
  orb: number;
  isApplying: boolean;
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
```

Rules:
- Accepts exactly one positional UUID (or unique prefix).
- Requires `--when` (fails with `VALIDATION_ERROR` if missing or malformed).
- Accepts optional `--where "lat, lon, Place"`.
- Returns AXI `NOT_FOUND` if the UUID does not match any profile.
- Output is rendered deterministically in TOON format with 2-space indentation.

## 4. Astrological Calculation Canon

- **Ephemerides**: Exact `caelus: "0.24.1"`.
- **Zodiac**: Tropical.
- **Houses**: Porphyry for local transit angles if `--where` provided.
- **Node**: True North Node (`true_node`).
- **Transit Orbs**: Strict canonical evolutionary orbs:
  - Luminares and inner planets (Sun through Mars): 1.5° max orb.
  - Social and transpersonal planets (Jupiter through Pluto, True Node, True Lilith): 2.5° max orb.
- **Applying vs Separating**: Determined by relative longitudinal speed between transiting body and natal point.
- **Evolutionary Triggers**:
  - Transits aspecting Natal Pluto and Natal PPP.
  - Transits aspecting Natal Nodal Axis.
  - Transits aspecting Natal Skipped Step bodies (including resolution node).
  - Transits aspecting Natal Final Dispositors or Mutual Reception participants.

## 5. Ephemeris Seam

Uses `EphemerisGateway` (`src/adapters/ephemeris.ts`) wrapping Caelus `Engine.chartAt`, `findAspects`, and `outOfBounds`.

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
src/domain/birth-input.ts
src/domain/transit-input.ts
src/domain/toon.ts
src/engine/shared/geometry.ts
src/engine/shared/rulers.ts
src/engine/shared/aspects.ts
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
src/storage/schema.ts
src/storage/profile-store.ts
src/adapters/ephemeris.ts
```
