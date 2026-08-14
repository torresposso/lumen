# Lumen

Western evolutionary astrology CLI built on the caelus ephemeris engine.

## Language

### Core

**Natal chart**:
The base chart for one birth instant and place: body positions, house cusps, angles, and aspects.
_Avoid_: birth chart, horoscope

**Astrological reading**:
The complete, immutable assembled calculation result containing the natal chart, optional draconic projections, astronomical extensions, and evolutionary analysis.
_Avoid_: chart output object, raw chart

**Natal intake**:
The process of parsing, validating, and resolving raw CLI inputs into a validated Resolved birth and Chart request options.
_Avoid_: flag parser, argument validator

**Resolved birth**:
A local birth time and place turned into a UT Julian Day with timezone provenance (zone, offset, DST, status).
_Avoid_: birth data, birth record

**Draconic chart**:
A natal chart re-projected onto the lunar-node zodiac by subtracting the North Node's longitude from all positions, placing the North Node at 0° Aries. Preserves aspects and angular separations.
_Avoid_: soul chart

### Evolutionary astrology (Jeffrey Wolf Green)

**Evolutionary reading**:
The assembled output of the `--evolutionary` flag: Pluto's placement and Polarity Point, the lunar-node axis with its planetary rulers and their natal house/sign placements, Skipped Steps, the Pluto–North Node Midpoint, and the Pluto/Chiron dispositor chains.

**Pluto Polarity Point**:
The point diametrically opposite Pluto (Pluto longitude + 180°), representing the evolutionary direction the soul is moving toward. Deactivated when Pluto is conjunct the North Node (as evolution channels directly through the North Node and its ruler).

**Pluto Polarity Point aspects**:
Major planetary aspects (orb ≤ 5°) formed directly to the Pluto Polarity Point, identifying specific psychological archetypes accelerating or facilitating evolutionary growth.

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
Planets that square the nodal axis or Pluto (orb ≤ 5°), indicating unresolved evolutionary dynamics from prior lives.

**Dispositor chain**:
The sequence of planetary sign rulers traced from a body to its final dispositor or mutual reception loop, revealing the underlying psychological driver.

**Pluto-North Node Midpoint**:
The midpoint calculated between Pluto and the North Node, marking the integration channel between the soul's primary desire and its future evolutionary direction.

**Prenatal eclipses**:
The solar eclipse (projecting the Sun) and lunar eclipse (projecting the Moon) immediately preceding birth, marking the soul's evolutionary intentions for the current life.
_Avoid_: prenatal lunation

### Classical extensions

**Hermetic lots**:
Calculated points derived from the Ascendant, Sun, and Moon — specifically the Lot of Spirit and the Lot of Fortune.
_Avoid_: Arabic parts

**Fixed stars**:
Major star alignments (orb ≤ 1.5°) with natal body positions.

