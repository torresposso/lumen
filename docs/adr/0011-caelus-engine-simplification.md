# ADR-0011 — Caelus Ephemeris Engine Simplification

To prevent re-implementing solved astronomical and geometrical calculations, `src/engine/` is simplified by delegating core celestial geometry directly to `caelus: 0.24.1`.

## Context & Problem

In earlier iterations, `src/engine/aspects.ts` re-implemented custom routines for:
1. Astrological signature analysis (hemispheric, quadrant, elemental, and modal distributions).
2. Generic aspect detection, longitudinal separation, and applying/separating phase calculus.
3. Declination aspect calculations (parallels and contraparallels).

`caelus: 0.24.1` natively exports high-performance, validated primitives for these tasks (`chartSignature`, `findAspects` / `rawChart.aspects`, and `declinationAspects`).

## Decision

1. **Delegate Astronomical Primitives to Caelus**:
   - Astrological signature is computed via `caelus.chartSignature(rawChart)`.
   - Generic chart aspects are computed via `caelus.findAspects(rawChart.bodies)` / `rawChart.aspects`.
   - Declination aspects are computed via `ephemeris.declinationAspects` (wrapping `caelus.declinationAspects`).
2. **Preserve JWGEA Domain Logic in Lumen**:
   - Pluto evolutionary aspects (`PLUTO_ASPECTS` with non-standard orbs and stress criteria).
   - PPP (Pluto Polarity Point) calculation and deactivation rule (`separation <= 3.0°` from True North Node).
   - Skipped steps (planetary squares to the nodal axis).
   - Dispositor chain resolution.
3. **Ephemeris Seam Extension**:
   - `Ephemeris` port (`src/adapters/ephemeris.ts`) and `InMemoryEphemeris` test double expose `declinationAspects` to preserve pure dependency injection without direct I/O or global state.
