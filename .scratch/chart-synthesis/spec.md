# Spec — Chart Synthesis & Evolutionary Interpretations (Lumen v2)

> Deliverable of the feature effort `.scratch/chart-synthesis/`.
> Implementation of modular `--interpret` flags across atomic chart commands and the unified `lumen chart synthesis` orchestrator based on the JWGEA 3-Layer Soul Stack.

## 1. Product

Lumen v2 provides deterministic, non-hallucinatory interpretive synthesis capabilities:

1. **Atomic Interpretations (`--interpret`)**:
   - `lumen chart natal <name> --interpret`: Extracts and structures the core karmic root, evolutionary axis, skipped steps, and soul lots from the natal chart.
   - `lumen chart transits <name> --when "<iso>" [--where "lat, lon, place"] --interpret`: Structures current active triggers, house activations, and out-of-bounds pressure.
   - `lumen chart progressions <name> --when "<iso>" --interpret`: Structures the 28-year Sol-Luna evolutionary season, archetype phase, and progressed triggers.

2. **Unified Evolutionary Synthesis (`chart synthesis`)**:
   - `lumen chart synthesis <name> --when "<iso>" [--where "lat, lon, place"]`: Weaves together the 3 layers (Karmic Root, Soul Clock, Cosmic Triggers) plus a 4th automated Cross-Synthesis layer (`evolutionaryDynamics`) that calculates which active transits press against natal wounds or skipped steps and highlights their canonical `resolutionNode`.

All calculations are deterministic using `caelus: "0.24.1"` ephemerides and strict JWGEA canon (Porphyry houses, True Node, tight orbs).

## 2. Output Data Model

### A. Atomic Interpretation Types

```typescript
export interface NatalInterpretationOutput {
  natalInterpretation: {
    profile: ToonProfile;
    karmicRoot: {
      pluto: {
        sign: string;
        house: number;
        degree: number;
        isRetrograde: boolean;
        polarityPoint: { sign: string; house: number; degree: number };
      };
      nodalAxis: {
        northNode: { sign: string; house: number; ruler: string; rulerLocation: { sign: string; house: number } };
        southNode: { sign: string; house: number; ruler: string; rulerLocation: { sign: string; house: number } };
      };
      skippedSteps: Array<{
        planet: string;
        sign: string;
        house: number;
        squareToNode: "north" | "south" | "both";
        resolutionNode: "north" | "south";
      }>;
      dispositorDynamics: {
        dominantLoop: string[];
        finalDispositors: string[];
      };
      prenatalEclipses: {
        solar: { sign: string; house: number; formatted: string };
        lunar: { sign: string; house: number; formatted: string };
      };
      soulLots: {
        lotOfFortune: { sign: string; house: number; formatted: string };
        lotOfSpirit: { sign: string; house: number; formatted: string };
      };
    };
  };
}

export interface TransitsInterpretationOutput {
  transitsInterpretation: {
    target: {
      dateTime: string;
      jdUt: number;
      coordinates?: { lat: number; lon: number; place?: string };
    };
    natal: ToonProfile;
    activeTriggers: Array<{
      transitingBody: string;
      natalPoint: string;
      aspect: string;
      orb: number;
      isApplying: boolean;
      transitingHouse: number;
      natalHouseRuled?: number;
    }>;
    outOfBoundsTransits: Array<{
      planet: string;
      declination: number;
      status: "out_of_bounds_north" | "out_of_bounds_south";
    }>;
  };
}

export interface ProgressionsInterpretationOutput {
  progressionsInterpretation: {
    target: {
      dateTime: string;
      jdUt: number;
      ageYears: number;
      progressedJdUt: number;
    };
    natal: ToonProfile;
    solLunaPhase: {
      phaseNumber: number;
      phaseName: string;
      archetype: string;
      sunMoonAngle: number;
      isWaxing: boolean;
      description: string;
    };
    progressedSun: { sign: string; house: number; degree: number };
    progressedMoon: { sign: string; house: number; degree: number };
    progressedTriggers: Array<{
      progressedBody: string;
      natalPoint: string;
      aspect: string;
      orb: number;
    }>;
  };
}
```

### B. Unified Evolutionary Synthesis Output

```typescript
export interface EvolutionarySynthesisOutput {
  synthesis: {
    profile: ToonProfile;
    targetMoment: {
      when: string;
      where?: string;
      jdUt: number;
    };
    karmicRoot: NatalInterpretationOutput["natalInterpretation"]["karmicRoot"];
    soulClock: {
      phase: {
        name: string;
        number: number;
        angle: number;
        isWaxing: boolean;
      };
      progressedSun: { sign: string; house: number; degree: number };
      progressedMoon: { sign: string; house: number; degree: number };
      progressedTriggers: Array<{
        progressedBody: string;
        natalPoint: string;
        aspect: string;
        orb: number;
      }>;
    };
    cosmicTriggers: {
      activeTransits: TransitsInterpretationOutput["transitsInterpretation"]["activeTriggers"];
      outOfBoundsTransits: TransitsInterpretationOutput["transitsInterpretation"]["outOfBoundsTransits"];
    };
    evolutionaryDynamics: {
      skippedStepActivations: Array<{
        transitingBody: string;
        transitingHouse: number;
        skippedPlanet: string;
        aspect: string;
        orb: number;
        resolutionNode: "north" | "south";
        targetNode: { sign: string; house: number };
      }>;
      plutoNodePressure: Array<{
        transitingBody: string;
        transitingHouse: number;
        targetPoint: "pluto" | "ppp" | "north_node" | "south_node";
        aspect: string;
        orb: number;
      }>;
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
lumen chart natal <name> [--interpret]
lumen chart transits <name> --when "YYYY-MM-DDTHH:MM±HH:MM" [--where "lat, lon, Place"] [--interpret]
lumen chart progressions <name> --when "YYYY-MM-DDTHH:MM±HH:MM" [--interpret]
lumen chart synthesis <name> --when "YYYY-MM-DDTHH:MM±HH:MM" [--where "lat, lon, Place"]
```

### Invariants:
1. When `--interpret` is passed to `natal`, `transits`, or `progressions`, it returns `{ natalInterpretation }`, `{ transitsInterpretation }`, or `{ progressionsInterpretation }`.
2. Without `--interpret`, the atomic commands return their canonical raw TOON blocks (`{ chart }`, `{ transits }`, `{ progressions }`).
3. `lumen chart synthesis` always requires `--when` and accepts optional `--where`. It returns `{ synthesis }`.
4. Standard AXI errors apply: `NOT_FOUND` on unknown name, `VALIDATION_ERROR` on invalid/missing flags.

## 4. Canon & Synthesis Logic

1. **Skipped Step Resolution**:
   If a transiting planet aspects a natal skipped step, `evolutionaryDynamics.skippedStepActivations` explicitly links to the planet's canonical `resolutionNode` (North Node or South Node based on nodal motion history).
2. **Pluto / Node Pressure**:
   Transits forming major aspects (conjunction, square, opposition, trine, sextile) to natal Pluto, PPP, North Node, or South Node within tight JWGEA orbs ($\le 3^\circ$ for transits).
3. **Phase Context Guidance**:
   The 28-year Progressed Sol-Luna Phase provides the evolutionary background coloring the current era (e.g. *Balsamic / Phase 8: Karma culmination, distillation, and release before the upcoming new cycle*).

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
src/engine/synthesis/types.ts
src/engine/synthesis/index.ts
src/storage/schema.ts
src/storage/profile-store.ts
src/adapters/ephemeris.ts
```
