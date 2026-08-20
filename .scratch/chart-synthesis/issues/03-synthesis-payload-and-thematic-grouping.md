# Issue 03: Synthesis Payload and Thematic Groupings

## Context

The composite command `lumen chart synthesis <uuid> --when "<iso>" [--where "<lat, lon, place>"]` must weave together natal facts, progressed clock, and active transits into an actionable, non-hallucinatory payload for AI agents and human astrologers.

## Decision

The payload structure for `synthesis` consists of four distinct, high-value semantic sections:

```typescript
export interface EvolutionarySynthesisOutput {
  synthesis: {
    profile: ToonProfile;
    targetMoment: {
      when: string;
      where?: string;
      jdUt: number;
    };
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
    soulClock: {
      progressedSolLunaPhase: {
        phaseNumber: number;
        phaseName: string;
        archetype: string;
        sunMoonAngle: number;
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
      activeTransits: Array<{
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
    evolutionaryDynamics: {
      skippedStepActivations: Array<{
        transitBody: string;
        skippedPlanet: string;
        aspect: string;
        resolutionNode: "north" | "south";
        evolutionaryMandate: string;
      }>;
      plutoNodePressure: Array<{
        transitBody: string;
        targetPoint: "pluto" | "ppp" | "north_node" | "south_node";
        aspect: string;
        orb: number;
      }>;
      phaseContextGuidance: string;
    };
  };
}
```
