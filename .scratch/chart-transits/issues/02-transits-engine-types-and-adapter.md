# 02 — Transits engine types and ephemeris adapter

Type: implementation
Status: resolved
Blocked-by: 01-command-surface-and-args
Blocks: 03-transits-aspects-and-house-projections


## Goal

Define the pure domain types for transit calculations and ensure the Ephemeris gateway provides celestial positions, velocities, and optional local houses/angles for a given transit JD UT and coordinates.

## Requirements

1. Create `src/engine/transits/types.ts` defining `TransitChartOutput`, `TransitBody`, `TransitAspect`, `SkippedStepTransitActivation`, and related interfaces.
2. Adapt or verify `Ephemeris` port (`src/adapters/ephemeris.ts`) to compute celestial bodies (longitude, latitude, declination, speed, retrograde) and local houses (Porphyry) at the target instant.
3. Compute `outOfBounds` status for transiting bodies using true obliquity of the epoch.

## Verification

- Unit tests with `InMemoryEphemeris` and real Caelus ephemeris checking positions, speeds, retrogrades, and out-of-bounds at given JDs.
