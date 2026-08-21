# Spec — Chart Natal (Lumen v2)

> Deliverable of the wayfinder effort `.scratch/chart-natal/` — **destination reached, 2026-08-18**.
> Reimplementation of the natal chart calculation and JWGEA evolutionary mechanics as a pure function over v2 stored profiles.

## 1. Product

`lumen chart natal <name>` reads a v2 birth profile by its unique name from the local profile store and calculates its astrological natal chart and JWGEA evolutionary mechanics using exact `caelus: "0.24.1"` ephemerides.

The calculation is pure: it uses the profile's stored `birthJdUt`, `birthLat`, and `birthLon`. No external world facts, timezones, or geocoding are resolved at runtime.

## 2. Output Data Model

A single root object with key `chart`:

```typescript
export interface NatalChartOutput {
  birth: {
    id: string;
    name: string;
    birthPlace: string;
    birthDateTime: string;
    birthLat: number;
    birthLon: number;
    birthJdUt: number;
  };
  meta: {
    houseSystem: "porphyry";
    zodiac: "tropical";
    ephemeris: string;
    solLunaPhase: {
      name: "New" | "Crescent" | "First Quarter" | "Gibbous" | "Full" | "Disseminating" | "Last Quarter" | "Balsamic";
      number: number;
      angle: number;
      isWaxing: boolean;
    };
  };
  bodies: Record<string, {
    sign: string;
    signDeg: number;
    house: number;
    retrograde: boolean;
    speed: number;
    dec: number;
    outOfBounds: boolean;
    dignities: string[];
  }>;
  angles: {
    asc: AnglePoint;
    mc: AnglePoint;
    vertex: AnglePoint;
    eastPoint: AnglePoint;
  };
  cusps: Array<{
    house: number;
    sign: string;
    signDeg: number;
    ruler: string;
  }>;
  aspects: Array<{
    a: string;
    b: string;
    aspect: string;
    orb: number;
    phase: "applying" | "separating" | "exact";
    strength: number;
    stress?: "stressful" | "nonstressful";
  }>;
  declinationAspects?: Array<{
    a: string;
    b: string;
    aspect: string;
    orb: number;
  }>;
  patterns: Array<{
    type: string;
    bodies: string[];
    orb?: number;
    element?: string;
    modality?: string;
    apex?: string;
    sign?: string;
    house?: number;
  }>;
  signature: {
    elements: { fire: number; earth: number; air: number; water: number };
    modalities: { cardinal: number; fixed: number; mutable: number };
    hemispheres: { eastern: number; western: number; northern: number; southern: number };
    quadrants: { q1: number; q2: number; q3: number; q4: number };
  };
  evolutionary: {
    ppp: {
      sign: string;
      signDeg: number;
      house: number;
      active: boolean;
      separationFromNorthNode?: number;
      aspects: Array<{ body: string; aspect: string; orb: number }>;
      antiscia?: {
        antiscion: ProjectedPoint;
        contraAntiscion: ProjectedPoint;
      };
    };
    plutoNorthNodeMidpoint: {
      near: ProjectedPoint;
      anti: ProjectedPoint;
    };
    nodalAxis: {
      motion: "retrograde" | "direct" | "stationary";
      north: {
        sign: string;
        signDeg: number;
        house: number;
        speed: number;
        dec: number;
        outOfBounds: boolean;
        ruler: string;
        rulerPlacement?: { body: string; sign: string; signDeg: number; house: number; motion: string };
        antiscia?: { antiscion: ProjectedPoint; contraAntiscion: ProjectedPoint };
      };
      south: {
        sign: string;
        signDeg: number;
        house: number;
        speed: number;
        dec: number;
        outOfBounds: boolean;
        ruler: string;
        rulerPlacement?: { body: string; sign: string; signDeg: number; house: number; motion: string };
        antiscia?: { antiscion: ProjectedPoint; contraAntiscion: ProjectedPoint };
      };
    };
    skippedSteps: Array<{
      body: string;
      aspect: string;
      orb: number;
      resolutionNode: "north" | "south";
    }>;
    dispositorChains: {
      pluto: DispositorChain;
      southNodeRuler?: DispositorChain;
      northNodeRuler?: DispositorChain;
    };
    prenatalEclipses: {
      solar?: { type: string; sign: string; signDeg: number; house: number; tMax: number; daysBeforeBirth: number };
      lunar?: { type: string; sign: string; signDeg: number; house: number; tMax: number; daysBeforeBirth: number };
    };
    trueLilith: {
      sign: string;
      signDeg: number;
      house: number;
      speed: number;
      dec: number;
      outOfBounds: boolean;
    };
    soulLots: {
      isDay: boolean;
      fortune: ProjectedPoint;
      spirit: ProjectedPoint;
      eros: ProjectedPoint;
      necessity: ProjectedPoint;
      courage: ProjectedPoint;
      victory: ProjectedPoint;
      nemesis: ProjectedPoint;
    };
  };
}
```

## 3. CLI Contract

```
lumen profile add --when "YYYY-MM-DDTHH:MM±HH:MM" --where "lat, lon, Place" --name <slug>
lumen profile list
lumen profile get <name>
lumen profile delete <name>
lumen chart natal <name>
```

Rules:
- `lumen chart natal <name>` accepts exactly one positional name (the unique `name` supplied to `lumen profile add`).
- No inline flags (`--when`, `--where`, `--house-system` are rejected).
- Returns AXI `NOT_FOUND` if the name does not match any profile.
- Output is rendered deterministically in TOON format with 2-space indentation.

## 4. Astrological Calculation Canon

- **Houses**: Porphyry (`housesPorphyry(asc, mc)`), angle-derived, computed at all latitudes.
- **Bodies & Points**: `bodies` contains physical planetary bodies (Sun through Pluto and Chiron). Non-physical points are partitioned: True North Node & South Node in `nodalAxis`, True Lilith in `evolutionary.trueLilith`.
- **Astronomical Coordinates**: `bodies` holds exact `sign`, `signDeg`, `house`, `retrograde`, `speed`, `dec`, `outOfBounds`, `dignities` (pruning raw `lat`, `ra`, `dist`, and redundant absolute `lon`).
- **Aspects**: Unified single list of aspect geometries with `stress` categorization for JWGEA points and `phase` (`applying`/`separating`/`exact`).
- **PPP Deactivation**: Deactivated (`active: false`) when Pluto is conjunct the True North Node with separation `<= 3.0°`. Expressed factually via `active` boolean and `separationFromNorthNode`.
- **Eclipses**: Prenatal Solar and Lunar eclipses projected into natal houses with `daysBeforeBirth` temporal distance.
- **Soul Lots**: The 7 Hermetic Lots computed via day/night sect and projected into natal houses.

## 5. Ephemeris Seam

`EphemerisGateway` in `src/adapters/ephemeris.ts` wraps Caelus `Engine.chartAt` behind the `Ephemeris` interface.

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
src/storage/schema.ts
src/storage/profile-store.ts
src/adapters/ephemeris.ts
```



