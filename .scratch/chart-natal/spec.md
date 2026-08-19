# Spec — Chart Natal (Lumen v2)

> Deliverable of the wayfinder effort `.scratch/chart-natal/` — **destination reached, 2026-08-18**.
> Reimplementation of the natal chart calculation and JWGEA evolutionary mechanics as a pure function over v2 stored profiles.

## 1. Product

`lumen chart natal <uuid>` reads a v2 birth profile by UUID from the local profile store and calculates its astrological natal chart and JWGEA evolutionary mechanics using exact `caelus: "0.24.1"` ephemerides.

The calculation is pure: it uses the profile's stored `birthJdUt`, `birthLat`, and `birthLon`. No external world facts, timezones, or geocoding are resolved at runtime.

## 2. Output Data Model

A single root object with key `chart`:

```typescript
export interface NatalChartOutput {
  birth: {
    id: string;
    name?: string | null;
    birthPlace: string;
    birthDateTime: string;
    birthLat: number;
    birthLon: number;
    birthJdUt: number;
  };
  houseSystem: "porphyry";
  zodiac: "tropical";
  bodies: Record<string, ChartBody>;
  angles: {
    asc: AnglePoint;
    mc: AnglePoint;
    vertex: AnglePoint;
    eastPoint: AnglePoint;
  };
  cusps: HouseCusp[];
  aspects: ChartAspect[];
  declinationAspects?: DeclinationAspect[];
  pluto: PlutoEvolutionaryFact;
  ppp: PPPEvolutionaryFact;
  midpoint?: PointPosition;
  antiMidpoint?: PointPosition;
  nodalAxis: NodalAxisFact;
  phase?: string;
  dispositorChains: DispositorChains;
  prenatalEclipses: PrenatalEclipses;
  patterns: AspectPattern[];
  signature: AstrologicalSignature;
  houseRulers: HouseRuler[];
  counts: ChartCounts;
  method: string;
}
```

## 3. CLI Contract

```
lumen profile add --when "YYYY-MM-DDTHH:MM±HH:MM" --where "lat, lon, Place" [--name <slug>]
lumen profile list
lumen profile get <uuid>
lumen profile delete <uuid>
lumen chart natal <uuid>
```

Rules:
- `lumen chart natal <uuid>` accepts exactly one positional UUID (or unique prefix).
- No inline flags (`--when`, `--where`, `--house-system` are rejected).
- Returns AXI `NOT_FOUND` if the UUID does not match any profile.
- Output is rendered deterministically in TOON format with 2-space indentation.

## 4. Astrological Calculation Canon

- **Houses**: Porphyry (`housesPorphyry(asc, mc)`), angle-derived, computed at all latitudes.
- **Node**: True North Node (`true_node`).
- **Aspect Orbs**: Standard canon orbs for major geometric aspects and Pluto/PPP evolutionary aspects.
- **PPP Deactivation**: Deactivated (`active: false`) when Pluto is conjunct the True North Node with separation `<= 3.0°`.
- **Method Disclosure**: Standard JWGEA canon disclosure string.

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
src/engine/natal.ts
src/storage/schema.ts
src/storage/profile-store.ts
src/adapters/ephemeris.ts
```



