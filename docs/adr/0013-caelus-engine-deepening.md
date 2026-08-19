# ADR-0013 — Deepening Caelus Ephemeris Delegation in Natal Engine

Refactor and simplify `src/engine/natal.ts` by delegating midpoints, sign element/modality classifications, and chart-level pattern/signature reductions directly to `caelus: 0.24.1` primitives.

## Context & Problem

In ADR-0011 and ADR-0012, `src/engine/natal.ts` was consolidated into a single deep module. However, several internal helper routines still duplicated celestial mechanics already solved and validated by Caelus:
1. `computeMidpoints` manually calculated the shortest arc on the circle and anti-midpoint modulo 360, even though `caelus` exports `midpointLon(a, b)`.
2. Hand-written mapping dictionaries `SIGN_ELEMENTS` and `SIGN_MODALITIES` mirrored Caelus's native `element(sign)` and `modality(sign)` functions.
3. Pattern and signature reductions (`detectAspectPatterns` and `calculateAstrologicalSignature`) performed intermediate dictionary transformations over bodies instead of directly delegating `detectPatterns(rawChart)` or using native `Chart` inputs.

## Decision

1. **Delegate Midpoints to Caelus**:
   - Compute near midpoint longitude via `midpointLon(lonA, lonB)`.
   - Derive anti-midpoint longitude as `normalizeLongitude(nearLon + 180)`.
2. **Delegate Element & Modality Classification**:
   - Replace manual `SIGN_ELEMENTS` and `SIGN_MODALITIES` lookups with Caelus `element(sign)` and `modality(sign)`.
   - Retain `SIGN_RULERS` modern JWGEA astrological rulerships (Scorpio -> Pluto, Aquarius -> Uranus, Pisces -> Neptune) as required by evolutionary canon.
3. **Streamline Pattern and Signature Delegation**:
   - Pass `rawChart` directly into `detectPatterns(rawChart)` and `chartSignature(rawChart)` without constructing redundant intermediate shape wrappers.
4. **Preserve Public Interface and TOON Contract**:
   - `computeNatalChart(profile, ephemeris)` and its published `NatalChartOutput` remain strictly identical and golden-vector compatible.
