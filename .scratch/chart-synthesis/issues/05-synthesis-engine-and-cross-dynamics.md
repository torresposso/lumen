# Issue 05: Synthesis Engine and Cross-Layer Dynamics

## Scope

1. Create `src/engine/synthesis/types.ts` and `src/engine/synthesis/index.ts`.
2. Implement `computeEvolutionarySynthesis(profile: Profile, targetInput: TransitInput, ephemeris: Ephemeris)`:
   - Call `computeNatalChart`, `computeProgressedChart`, `computeTransitChart`.
   - Extract `karmicRoot`, `soulClock`, `cosmicTriggers`.
   - Calculate `evolutionaryDynamics`:
     - Cross-correlate active transits with natal skipped steps and assign `resolutionNode`.
     - Cross-correlate active transits with Pluto/PPP/Nodal Axis.
     - Formulate phase context guidance string.
3. Unit tests for `computeEvolutionarySynthesis` with deterministic golden vectors.
