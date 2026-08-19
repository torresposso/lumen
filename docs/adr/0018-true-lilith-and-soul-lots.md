# ADR-0018 — True Lilith & Hermetic Soul Lots (Fortune & Spirit) Integration

Integrate **True Lilith** (`true_lilith`, osculating lunar apogee) and **Hermetic Soul Lots** (`fortune` and `spirit`) into the `lumen chart natal` output and `Ephemeris` port, deepening evolutionary chart synthesis with zero external dependencies.

## Context & Problem

1. In Evolutionary Astrology (JWGEA and ancestral soul mechanics), **True Lilith** represents primordial instinctive wisdom, core soul trauma, and repressed truth operating in tandem with Pluto and the Nodal Axis.
2. In classical and Hellenistic evolutionary lineage, the **Lot of Fortune** represents the material vessel and physical incarnation (conditioned by the Moon), while the **Lot of Spirit** (*Daimon*) represents the active soul intention, intellect, and spiritual will (conditioned by the Sun).
3. `caelus: "0.24.1"` computes both True Lilith natively in its embedded ephemeris and provides pure geometric lot calculation (`lotFortune`, `lotSpirit`).
4. `lumen chart natal` previously excluded `true_lilith` from default body projections and lacked soul lot coordinates, leaving an interpretive gap in soul dynamics.

## Decision

1. **Include `true_lilith` in Default Bodies**:
   - Add `true_lilith` to `DEFAULT_BODIES` in `src/engine/natal/index.ts`.
   - Project `true_lilith` alongside the other planetary bodies with standard coordinate, sign, house, declination, and out-of-bounds metrics.
2. **Encapsulate Lots Calculation in `Ephemeris` Port & Natal Engine**:
   - Compute `fortune` and `spirit` using exact day/night chart sect (`isDayChart`) and ecliptic ASC, Sun, and Moon longitudes.
   - Project `lots: { fortune: ProjectedEclipticPoint; spirit: ProjectedEclipticPoint }` into `NatalChartOutput`.
3. **Preserve Determinism & Zero Runtime Overhead**:
   - Both calculations are 100% pure functions of the natal instant and coordinates (`birthJdUt`, `birthLat`, `birthLon`).
   - Testing verifies exact parity on both real ephemeris (`CaelusEphemeris`) and `InMemoryEphemeris`.
