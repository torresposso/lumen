# Lumen

Western evolutionary astrology CLI built on the caelus ephemeris engine — the personal instrument for learning the tradition (Green's Pluto lens and Forrest's nodal lens) by practicing on one's own chart and one's family before applying it with others.

> **Arquitectura de referencia**: `src/core/` es cálculo puro (sin I/O, zod o AxiError); `src/adapters/` aísla Open-Meteo y Caelus; `src/storage/` persiste en XDG con `0600` y escritura atómica; `src/commands/` son comandos AXI delgados; `src/cli.ts` enruta los 5 comandos AXI. La especificación definitiva vive en `DOMAIN.md` y la implementación en `SPEC.md`.

## Language

### Core

**Natal chart**:
The base chart for one birth instant and place: body positions, house cusps, angles, and aspects.
_Avoid_: birth chart, horoscope

**Astrological reading**:
The complete, immutable assembled calculation result containing the natal chart, optional draconic projections, astronomical extensions, and evolutionary analysis.
_Avoid_: chart output object, raw chart

**Natal intake**:
The process of parsing, validating, and resolving raw CLI inputs into a validated Resolved birth and Chart request options. Lives in `src/commands/intake.ts` (the only zod contact point); `src/core/birth.ts` performs only the pure UT/provenance resolution.
_Avoid_: flag parser, argument validator

**Resolved birth**:
A local birth time and place turned into a UT Julian Day with timezone provenance (zone, offset, DST, status). Status is caelus's union: `ok | ambiguous | nonexistent`.
_Avoid_: birth data, birth record

**Draconic chart**:
A natal chart re-projected onto the lunar-node zodiac by subtracting the North Node's longitude from all positions, placing the North Node at 0° Aries. Preserves aspects and angular separations. Outside the evolutionary canon; kept as a labeled experiment.
_Avoid_: soul chart

**Interpretation context**:
The `interpretationContext` block of an astrological reading: deterministic factual atoms (snake_case identifiers such as `pluto_sign_libra`, `north_node_ruler_sun`) that an agent uses to interpret a chart without re-parsing the TOON output. Covers the base chart and, with `--evo`, the evolutionary mechanics.
_Avoid_: reading, interpretation output

**Chart signature**:
The tally of the ten core planets (sun through pluto; chiron and the lunar nodes excluded) by element, modality, quadrant, and hemisphere. Published as `chart.signature` and mirrored in the `dominant_*` atoms.

**Aspect strength**:
caelus's normalized strength of a listed aspect (`1 - orb / orb-limit`, computed from the rounded orb; 1.0 = exact). A contact sitting exactly on the orb limit is still listed but reads `strength: 0` — accept it as present, not absent. Known boundary quantization (audit S10), never an error.
_Avoid_: reading `strength: 0` as "no aspect"

### Evolutionary astrology (Green & Forrest)

**Evolutionary astrology**:
The tradition that reads the natal chart as the map of the soul's current lesson: where it has been and where it is going. Two lenses share one canon — Green's Pluto (the soul and its evolutionary point) and Forrest's nodal axis (the karmic story). The choice of lens is resolved by practice, not analysis.
_Avoid_: karmic astrology, past-life astrology

**Evolutionary reading**:
The complete mechanical block delivered by `chart natal --evo`: Pluto's
placement and Polarity Point, the lunar-node axis with its planetary rulers and
their natal house/sign placements, Skipped Steps, the Pluto–North Node
Midpoint, Sol-Luna phase, dispositor chains, and prenatal eclipses.
_Avoid_: soul reading

**Evo block**:
The opt-in `evo` output added to a natal chart by `--evo`. Always geometric,
never interpretive. Not available on `chart draconic`. The block is
self-contained (`lon`/`signDeg` at 4 decimal places, like `chart.bodies`), uses
`PLUTO_ASPECTS` orbs (which may differ from `chart.aspects`), exposes both
`midpoint` and `antiMidpoint`, includes Pluto in `nodeAspects` (but never in
`skippedSteps`), publishes its criteria in `method`, and bridges to `summary`
via `counts`. With `--evo`, the interpretation context adds atoms for the
evolutionary mechanics.

**Pluto Polarity Point**:
The point diametrically opposite Pluto (Pluto longitude + 180°), representing the evolutionary direction the soul is moving toward. Deactivated when Pluto is conjunct the North Node within orb ≤ 10° (as evolution channels directly through the North Node and its ruler); the angular Pluto–North Node separation is published as `evo.ppp.separation` and, when inactive, the cause as `evo.ppp.reason`.

**Pluto Polarity Point aspects**:
Major planetary aspects (orb ≤ 5°) formed directly to the Pluto Polarity Point, identifying specific psychological archetypes accelerating or facilitating evolutionary growth. The polarity point does not apply when Pluto is conjunct the North Node.

**Node motion status**:
The motion state of the lunar node axis (`retrograde`, `direct`, or `stationary`), where stationary nodes mark pivotal karmic turning-point incarnations.

**Nodal ruler placements**:
The exact natal sign, degree, house, and motion state of the planetary rulers of both the North Node and South Node, describing how past karmic memory and future evolutionary intentions are materialized.

**Sol-Luna phase mechanics**:
The angular phase relationship between the Sun and Moon divided into 8 evolutionary phase archetypes (New, Crescent, First Quarter, Gibbous, Full, Disseminating, Last Quarter, Balsamic).

**South Node**:
The point diametrically opposite the North Node (North Node longitude + 180°), representing the soul's past-life default patterns. Derived, not read directly from the ephemeris.
_Avoid_: descending node, Ketu

**Skipped Steps**:
Planets that square the lunar nodal axis (orb ≤ 5°), indicating unresolved evolutionary dynamics from prior lives. A square to Pluto by itself is a Pluto aspect, not a skipped step. Pluto is deliberately excluded from skipped steps; its relationship to the nodes appears in `nodeAspects` and the midpoint/PPP mechanics.

**Dispositor chain**:
The sequence of planetary sign rulers traced from a body to its final dispositor or mutual reception loop, revealing the underlying psychological driver.

**Pluto-North Node Midpoint**:
The near midpoint (shortest arc) between Pluto and the North Node, marking the integration channel between the soul's primary desire and its future evolutionary direction. Exposed as `evo.midpoint`; the opposite point is `evo.antiMidpoint`.

**Prenatal eclipses**:
The solar eclipse (projecting the Sun) and lunar eclipse (projecting the Moon) immediately preceding birth, marking the soul's evolutionary intentions for the current life.
_Avoid_: prenatal lunation

