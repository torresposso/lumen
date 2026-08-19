# ADR-0017 — Ephemeris Port Aspects Deepening & Seam Hermeticity

Deepen the `Ephemeris` capability port (`src/adapters/ephemeris.ts`) to encapsulate longitudinal aspect detection (`aspects`) and aspect phase dynamics (`aspectPhase`), eliminating direct third-party `caelus` runtime imports from the natal engine and shared domain modules.

## Context & Problem

1. While celestial chart generation (`chartAt`), eclipses, declination aspects, out-of-bounds calculations, planetary returns, and progressions were cleanly routed through the `Ephemeris` capability port, longitudinal aspect detection in `src/engine/natal/index.ts` directly imported and invoked `findAspects` from `caelus`.
2. Similarly, `src/engine/shared/aspects.ts` imported `aspectPhase` directly from `caelus`.
3. This created a leaky seam: the natal calculation engine was tightly coupled to runtime Caelus library functions instead of its capability port, preventing `InMemoryEphemeris` from fully controlling aspect fixtures and violating port locality.

## Decision

1. **Extend `Ephemeris` Capability Port**:
   - Add `aspects(bodies: Record<string, Position>, orbs?: Record<string, number>): Aspect[]` to the `Ephemeris` port interface.
   - Add `aspectPhase(lonA: number, speedA: number, lonB: number, speedB: number, target: number): "applying" | "separating" | "exact"` (or encapsulate via port/adapter exports).
   - Implement `aspects` in `CaelusEphemeris` delegating to Caelus's native `findAspects`.
   - Implement `aspects` in `InMemoryEphemeris` supporting fixture overrides and defaulting to `findAspects`.
2. **Seal Natal Engine and Shared Modules**:
   - Refactor `src/engine/natal/index.ts` to call `ephemeris.aspects(bodyMap, orbs)` instead of importing `findAspects` from `caelus`.
   - Re-export astronomical domain types (`Aspect`, `Position`, `BodyId`, `Chart`) from `src/adapters/ephemeris.ts`.
   - Ensure `src/engine/` modules import only erased TypeScript types from `caelus` or via the adapter.
3. **Hermetic Testing**:
   - Expand `tests/adapters/ephemeris.test.ts` to verify aspect calculation and fixture overrides across both `CaelusEphemeris` and `InMemoryEphemeris`.
