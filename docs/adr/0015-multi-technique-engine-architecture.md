# ADR-0015 — Domain Engine Architecture for Multi-Technique Astrology

Decompose the monolithic natal engine into shared astrological/geometric primitives (`src/engine/shared/`) and a dedicated natal technique package (`src/engine/natal/`), establishing an extensible foundation for future astrology techniques (synastry, progressions, transits).

## Context & Problem

Previously (`ADR-0012`), `src/engine/natal.ts` was consolidated into a single ~1,200-line file. While this simplified module counts, it introduced significant friction:
1. Universal astrological concepts (ecliptic geometry, modern JWGEA rulerships, aspect evaluation with orbs) were tangled with natal-specific evolutionary canon (Pluto polarity point, skipped steps, prenatal eclipses).
2. Implementing future multi-chart techniques (such as synastry overlays, composite charts, secondary progressions, or transits) would either bloat `natal.ts` further or cause code duplication.
3. Maintainers lacked locality: fixing a nodal step rule required navigating a 1,200+ line module.

## Decision

1. **Establish Shared Astrological Primitives (`src/engine/shared/`)**:
   - `geometry.ts`: Angle normalization ($0^\circ \dots 360^\circ$), shortest-arc angular distance, coordinate projection onto zodiac signs and houses.
   - `rulers.ts`: Canonical modern JWGEA sign rulerships (`SIGN_RULERS`) and dispositor chain traversal.
   - `aspects.ts`: Generic point-to-point aspect matching, orb evaluation, and applying/separating phase detection.

2. **Organize Natal Technique Package (`src/engine/natal/`)**:
   - `index.ts`: The deep composition entry point exposing `computeNatalChart(profile, ephemeris)`.
   - `types.ts`: Public data contracts and output interfaces for the natal chart.
   - `pluto-polarity.ts`: Pluto evolutionary mechanics, Pluto Planetary Polarity Point (PPP), deactivation orbs, and Pluto aspect evaluation.
   - `nodal.ts`: Nodal axis geometry, ruler placements, and skipped steps detection.
   - `eclipses.ts`: Prenatal solar and lunar eclipse detection and projection.
   - `patterns.ts`: Aspect patterns (Grand Trines, T-Squares, Stelliums, etc.) and hemisphere/element astrological signature calculations.

3. **Preserve Root Facade & Parity**:
   - `src/engine/natal.ts` re-exports all public types and `computeNatalChart` directly from `src/engine/natal/index.ts` for full backward compatibility across the codebase and test suite.
   - All 143 test vectors and TOON outputs remain byte-for-byte identical.
