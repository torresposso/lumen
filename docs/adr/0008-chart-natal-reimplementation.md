# ADR-0008: Natal Chart Reimplementation on Lumen v2

- **Status**: Accepted
- **Date**: 2026-08-18

## Context

Lumen v2 transitioned into a deterministic birth-profile manager, stripping interpretive readings and runtime geocoding/timezone lookups (ADR-0001). However, the core astrological capability — computing precise natal chart geometry and evolutionary mechanics (JWGEA canon) — was required as a pure function over stored birth profiles.

In v1, calculations used Placidus houses by default, generated multiple nested TOON blocks (`chart`, `evo`, `interpretationContext`), produced flat string atom lists (`atoms`), and relied on outdated dependencies.

## Decision

1. **Pure Profile Input**:
   `lumen chart natal <uuid>` operates strictly on stored profiles by UUID. It does not accept inline birth flags (`--when`/`--where`), enforcing separation between profile intake and chart computation.

2. **Single TOON Block (`chart`)**:
   Output is serialized as a single, top-level `chart` block. Measurements are presented first (birth echo, houseSystem, zodiac, bodies, angles, cusps, aspects, declinationAspects), followed by canon facts in JWGEA relevance order (pluto, ppp, midpoint/antiMidpoint, nodalAxis, phase, dispositorChains, prenatalEclipses, patterns, signature, houseRulers, counts, method).

3. **Porphyry Houses & True Node**:
   - Fixed to `porphyry` house system (angle-derived from ASC and MC; safe at extreme latitudes without polar fallbacks).
   - Fixed to `true_node`.

4. **Engine Pin**:
   Pinned to exact version `"caelus": "0.24.1"`.

5. **Deep Module Architecture**:
   - Seam: `src/adapters/ephemeris.ts` (`Ephemeris` interface wrapping Caelus).
   - Deep entry point: `src/core/chart.ts` (`computeNatalChart(profile, ephemeris)`).
   - Domain submodules under `src/core/astrology/` (`positions`, `soul`, `nodes`, `phases`, `dispositors`, `eclipses`, `patterns`).
   - CLI command: `src/commands/chart.ts` with `createSubcommandGroup`.
