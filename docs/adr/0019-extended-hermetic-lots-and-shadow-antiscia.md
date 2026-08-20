# ADR-0019 — Extended Hermetic Lots & Shadow Antiscia Integration

Integrate the complete 7 **Hermetic Lots** (`fortune`, `spirit`, `eros`, `necessity`, `courage`, `victory`, `nemesis`) and **Shadow Antiscia** (`antiscion` and `contraAntiscion`) for the core evolutionary axis (Pluto, PPP, True North Node, South Node) into `lumen chart natal`.

## Context & Problem

1. In Evolutionary Astrology (JWGEA and Hellenistic soul mechanics), the full seven Hermetic Lots provide key psychological and karmic markers:
   - `fortune`: physical vessel / material conditions (Moon)
   - `spirit`: conscious will and daimonic purpose (Sun)
   - `eros`: soul desire and relational attraction (Venus)
   - `necessity`: karmic constraints and mandatory lessons (Mercury)
   - `courage`: volitional grit and facing soul trials (Mars)
   - `victory`: evolutionary attainment and grace (Jupiter)
   - `nemesis`: karmic debt, subterranean fate, and unconscious shadow (Saturn)
2. Antiscia (solstitial reflection across Cancer/Capricorn) and Contra-antiscia (equinoctial reflection across Aries/Libra) reveal hidden unconscious shadow dynamics and karmic mirror points of planetary placements that are otherwise non-aspecting.
3. `caelus: 0.24.1` natively exports `hermeticLots`, `antiscion`, and `contraAntiscion`.
4. `lumen` previously computed only 2 lots (`fortune`, `spirit`) and lacked shadow reflection points for Pluto and the Nodal Axis.

## Decision

1. **Expand `lots` in `NatalChartOutput`**:
   - Compute the full set of 7 Hermetic lots via `caelus.hermeticLots` in `src/engine/natal/soul-lots.ts`.
   - Project each lot as a `ProjectedEclipticPoint` `{ lon, sign, signDeg, house }` under `lots`.
2. **Project Shadow Antiscia on Pluto and Nodal Axis**:
   - Provide `antiscion` and `contraAntiscion` for Pluto, PPP, North Node, and South Node using `caelus.antiscion` and `caelus.contraAntiscion`.
3. **Preserve Determinism & High Performance**:
   - All operations are pure $O(1)$ calculations over ecliptic longitudes and natal house cusps.
