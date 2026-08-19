# ADR-0016 — Deepening Caelus Ephemeris Port and Out-of-Bounds Projections

Deepen integration with `caelus: 0.24.1` by extending the `Ephemeris` capability port with planetary timing/cycle routines (`returns`, `progressedLongitude`, `pheno`) and exposing true astronomical out-of-bounds (`outOfBounds`) status on natal body projections.

## Context & Problem

1. In the JWGEA evolutionary astrology canon, Out-of-Bounds (OOB) planets (bodies exceeding the maximum solar declination / true obliquity of ~23°26') represent core evolutionary archetypes operating outside consensus reality. While `lumen` calculated raw `dec` (declination), it did not publish whether a body was out of bounds according to exact epoch obliquity.
2. The `Ephemeris` port interface (`src/adapters/ephemeris.ts`) was previously restricted to `chartAt`, `solarEclipses`, `lunarEclipses`, and `declinationAspects`. Advanced timing and cycle calculations provided out-of-the-box by Caelus (planetary returns, secondary progressions, photometrics/pheno) were not accessible through the capability port, hindering future evolutionary timing techniques.

## Decision

1. **Enrich Natal Body Projections with `outOfBounds`**:
   - Add `outOfBounds: boolean` to `ChartBodyProjection` in `src/engine/natal/types.ts`.
   - Calculate `outOfBounds` for each body using Caelus's native `outOfBounds(engine, body, jd)` via the `Ephemeris` capability port.
2. **Extend `Ephemeris` Port Interface**:
   - Add `outOfBounds(body, jdUt)`, `returns(body, natalJd, jdStart, jdEnd)`, `progressedLongitude(body, natalJd, targetJd)`, and `pheno(body, jdUt)` to `Ephemeris`.
   - Implement these methods in `CaelusEphemeris` delegating directly to Caelus primitives.
   - Implement deterministic defaults and fixture overrides in `InMemoryEphemeris` for fast, isolated unit testing.
3. **Prune Redundant Geometric Utilities**:
   - Ensure all shared ecliptic geometry and aspect math in `src/engine/shared/` cleanly delegates to Caelus functions (`midpointLon`, `SIGNS`, `houseOf`, `aspectPhase`).
