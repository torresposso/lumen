# Prototype — single-block `chart` output structure (ticket 02)

> **Prototipo (descartable por diseño, sube de fidelidad la discusión).** Generado el 2026-08-18 contra el código v1 (`297b08e`, worktree throwaway `/tmp/opencode/lumen-v1`) con `houseSystem: "porphyry"` y el dataset real del ancla Tampa. El sample TOON de abajo está **codificado con `encode()` de `@toon-format/toon`** (el encodificador AXI real que usa lumen v1/v2) — no es una transcripción.
>
> Sample under consideration: **Tampa, 1990-06-10 14:30 America/New_York** (EDT, UTC−4; jdUt 2448053.270833; 27.9506, −82.4572). Asc 3°26' Libra, MC 3°34' Cáncer, Sol Géminis 19.61° casa **9** (Porphyry), Plutón Escorpio 15.50° casa **2**, Nodo Norte Acuario 8.12° casa **5**.
>
> Generadores throwaway: `/tmp/opencode/lumen-v1/proto-tampa.ts` (lectura cruda) y `/tmp/opencode/lumen-v1/proto-shape.ts` (reestructura + encode).

## 1. Empaquetado del output

```
chart    ← UN bloque: mediciones + hechos del canon, claves planas por relevancia
help?    ← solo en respuesta de error/advertencia (lo inyecta el framework AXI)
```

No hay bloques `evo` ni `interpretationContext`, no hay lista plana de atoms, no hay `summary` (D1 resuelto: se elimina). Todo lo que publica `lumen chart natal` cuelga de `chart`.

## 2. El bloque `chart` — árbol de claves (orden = relevancia)

```
chart
  birth              ← eco del perfil v2 almacenado (claves ToonProfile exactas: id, name?,
                       birthPlace, birthDateTime, birthLat, birthLon, birthJdUt)      ← D3
  houseSystem        ← "porphyry" (marco fijo de todas las mediciones)                ← D2
  zodiac             ← "tropical"                                                     ← D2
  # ── mediciones (las mide el motor, no llevan method) ──
  bodies             ← sun…pluto, chiron, true_node: { lon, sign, signDeg, house,
                       retrograde, speed, lat, dist, ra, dec, dignities }             ← D4
  angles             ← asc, mc, vertex, eastPoint: { lon, sign, signDeg }
  cusps              ← 12 × { lon, sign, signDeg }
  aspects            ← { a, b, aspect, orb, phase, strength }
  declinationAspects ← { a, b, aspect, orb } (solo si hay ≥1)
  # ── hechos del canon evolutivo (JWGEA, en orden de lectura; method los declara) ──
  pluto              ← { sign, lon, house, signDeg, retrograde, stressfulCount,
                       nonstressfulCount, aspects: [{ body, aspect, orb, stress, phase }] }  ← D6
  ppp                ← { sign, lon, house, signDeg, active, separation?, reason?, aspects }
  midpoint           ← { lon, sign, signDeg, house }          ← D5 (v1: string de display)
  antiMidpoint       ← { lon, sign, signDeg, house }          ← D5 (v1: string de display)
  nodalAxis          ← { north: { …ruler, rulerPlacement, aspects }, south: { … },
                       motion, skippedSteps }
  phase              ← string ("Full"), solo cuando existe
  dispositorChains   ← { pluto, southNodeRuler?, northNodeRuler? }: [{ body, sign, ruler }]
  prenatalEclipses   ← { solar: { tMax, type, lon, sign, signDeg, house },
                       lunar: { … } }
  patterns           ← [{ type, bodies, apex?, sign?, house?, element?, modality?, orb? }]  ← D7
  signature          ← { hemispheres, quadrants, elements, modalities }
  houseRulers        ← 12 × { house, sign, ruler } (derivado de cusps + SIGN_RULERS)    ← D8
  counts             ← { plutoAspects, nodeAspects, skippedSteps, eclipses }
  method             ← disclosure del canon (abajo, con el marco añadido)               ← D9
```

**Orden = relevancia:** mediciones primero (nacimiento → marco → posiciones → aspectos), después los hechos del canon en el orden de lectura JWGEA (Plutón/PPP — el punto del alma —, eje nodal, fase, cadenas, eclipses, gestalt de patrones/firma), disclosures al final. La distinción medición-vs-canon queda expresada por las claves y por `method`, no por un bloque artificial.

## 3. Política de precisión (TOON surface)

Mismo canon que ADR-0011 (v1) + la política de `toon.ts` de v2; los valores almacenados conservan float64 completo:

| Campo | Dígitos |
|---|---|
| `lon`, `signDeg`, `lat`, `dist`, `ra`, `dec`, `tMax` | 4 |
| `speed` | 6 |
| `aspect.orb` | 4 |
| `aspect.strength` | 3 |
| `ppp.separation` | 2 |
| `birthJdUt` | 6 (política v2) |
| `birthLat`, `birthLon` | 4 (política v2) |

## 4. Qué muere y qué se deriva (mapping v1 → propuesto)

- `chart.meta.jdUt` → vive en `birth.birthJdUt` (una sola fuente, no se duplica).
- `chart.meta.houseSystemRequested` y `chart.meta.unavailable` → **mueren** (canon fijo; el motor embedded siempre resuelve — research 01).
- `chart.birth` (echo v1, campos de intake) → `chart.birth` con la **forma del perfil v2 almacenado** (claves planas `birth*`).
- `evo.*` → claves planas de `chart` (pluto, ppp, midpoint, antiMidpoint, nodalAxis, phase, dispositorChains, prenatalEclipses, counts, method).
- Atoms **duplicados** (`sun_sign_gemini` ↔ `bodies.sun.sign`, `pluto_aspects_8` ↔ `counts.plutoAspects`…) → **muertos**.
- Atoms **únicos** → estructurados: `patterns` y `signature` ya las publicaba v1 en `chart`; `house_2_ruler_pluto` → bloque `houseRulers` derivado (D8).
- Digests `dominant_element_earth` etc. → derivables de `signature` (no se publican).

## 5. Muestra TOON — Tampa 1990-06-10 14:30 (valores reales, Porphyry)

```toon
chart:
  birth:
    id: 4f3a9c2e-8b71-4d0a-9c5e-000000000000
    name: null
    birthPlace: "Tampa, Florida, USA"
    birthDateTime: "1990-06-10T14:30-04:00"
    birthLat: 27.9506
    birthLon: -82.4572
    birthJdUt: 2448053.270833
  houseSystem: porphyry
  zodiac: tropical
  bodies:
    sun:
      lon: 79.6107
      sign: Gemini
      signDeg: 19.6107
      house: 9
      retrograde: false
      speed: 0.947532
      lat: -0.0002
      dist: 1.0152
      ra: 78.6992
      dec: 23.0351
      dignities: []
    moon:
      lon: 285.1322
      sign: Capricorn
      signDeg: 15.1322
      house: 4
      retrograde: false
      speed: 15.329431
      lat: -2.0294
      dist: 0.0027
      ra: 286.674
      dec: -24.5997
      dignities[1]: detriment
    mercury:
      lon: 58.094
      sign: Taurus
      signDeg: 28.094
      house: 8
      retrograde: false
      speed: 1.487965
      lat: -2.4494
      dist: 1.0186
      ra: 56.4123
      dec: 17.3495
      dignities: []
    venus:
      lon: 43.2251
      sign: Taurus
      signDeg: 13.2251
      house: 8
      retrograde: false
      speed: 1.167045
      lat: -2.0171
      dist: 1.2235
      ra: 41.3974
      dec: 13.8861
      dignities[1]: domicile
    mars:
      lon: 7.6273
      sign: Aries
      signDeg: 7.6273
      house: 7
      retrograde: false
      speed: 0.723438
      lat: -1.9565
      dist: 1.3056
      ra: 7.7769
      dec: 1.229
      dignities[1]: domicile
    jupiter:
      lon: 104.8715
      sign: Cancer
      signDeg: 14.8715
      house: 10
      retrograde: false
      speed: 0.212443
      lat: 0.179
      dist: 6.1089
      ra: 106.1638
      dec: 22.7903
      dignities[1]: exaltation
    saturn:
      lon: 294.2973
      sign: Capricorn
      signDeg: 24.2973
      house: 4
      retrograde: true
      speed: -0.052626
      lat: 0.1228
      dist: 9.1626
      ra: 296.1775
      dec: -21.138
      dignities[1]: domicile
    uranus:
      lon: 278.3463
      sign: Capricorn
      signDeg: 8.3463
      house: 4
      retrograde: true
      speed: -0.037111
      lat: -0.3226
      dist: 18.4451
      ra: 279.1073
      dec: -23.5011
      dignities: []
    neptune:
      lon: 283.833
      sign: Capricorn
      signDeg: 13.833
      house: 4
      retrograde: true
      speed: -0.023631
      lat: 0.8761
      dist: 29.2792
      ra: 284.926
      dec: -21.852
      dignities: []
    pluto:
      lon: 225.501
      sign: Scorpio
      signDeg: 15.501
      house: 2
      retrograde: true
      speed: -0.021634
      lat: 15.8826
      dist: 28.8443
      ra: 227.6002
      dec: -1.2514
      dignities: []
    chiron:
      lon: 105.587
      sign: Cancer
      signDeg: 15.587
      house: 10
      retrograde: false
      speed: 0.098281
      lat: -6.2808
      dist: 11.9056
      ra: 106.1564
      dec: 16.2912
      dignities: []
    true_node:
      lon: 308.1182
      sign: Aquarius
      signDeg: 8.1182
      house: 5
      retrograde: true
      speed: -0.055538
      lat: 0
      dist: null
      ra: 310.537
      dec: -18.239
      dignities: []
  angles:
    asc:
      lon: 183.4492
      sign: Libra
      signDeg: 3.4492
    mc:
      lon: 93.5725
      sign: Cancer
      signDeg: 3.5725
    vertex:
      lon: 22.2934
      sign: Aries
      signDeg: 22.2934
    eastPoint:
      lon: 184.242
      sign: Libra
      signDeg: 4.242
  cusps[12]{lon,sign,signDeg}:
    183.4492,Libra,3.4492
    213.4903,Scorpio,3.4903
    243.5314,Sagittarius,3.5314
    273.5725,Capricorn,3.5725
    303.5314,Aquarius,3.5314
    333.4903,Pisces,3.4903
    3.4492,Aries,3.4492
    33.4903,Taurus,3.4903
    63.5314,Gemini,3.5314
    93.5725,Cancer,3.5725
    123.5314,Leo,3.5314
    153.4903,Virgo,3.4903
  aspects[23]{a,b,aspect,orb,phase,strength}:
    moon,venus,trine,1.91,separating,0.727
    moon,jupiter,opposition,0.26,separating,0.968
    moon,uranus,conjunction,6.79,separating,0.151
    moon,neptune,conjunction,1.3,separating,0.838
    moon,pluto,sextile,0.37,applying,0.907
    moon,chiron,opposition,0.45,applying,0.944
    mercury,saturn,trine,3.8,separating,0.457
    venus,jupiter,sextile,1.65,applying,0.588
    venus,uranus,trine,4.88,separating,0.303
    venus,neptune,trine,0.61,applying,0.913
    venus,pluto,opposition,2.28,applying,0.715
    venus,chiron,sextile,2.36,applying,0.41
    mars,uranus,square,0.72,applying,0.897
    mars,neptune,square,6.21,applying,0.113
    jupiter,uranus,opposition,6.53,separating,0.184
    jupiter,neptune,opposition,1.04,separating,0.87
    jupiter,pluto,trine,0.63,applying,0.91
    jupiter,chiron,conjunction,0.72,applying,0.91
    uranus,neptune,conjunction,5.49,separating,0.314
    uranus,chiron,opposition,7.24,separating,0.095
    neptune,pluto,sextile,1.67,separating,0.583
    neptune,chiron,opposition,1.75,separating,0.781
    pluto,chiron,trine,0.09,separating,0.987
  declinationAspects[10]{a,b,aspect,orb}:
    sun,jupiter,parallel,0.2448
    sun,uranus,contraparallel,0.466
    sun,neptune,contraparallel,1.1831
    moon,uranus,parallel,1.0986
    mercury,chiron,parallel,1.0583
    mercury,true_node,contraparallel,0.8895
    mars,pluto,contraparallel,0.0224
    jupiter,uranus,contraparallel,0.7109
    jupiter,neptune,contraparallel,0.9383
    saturn,neptune,parallel,0.714
  pluto:
    sign: Scorpio
    lon: 225.501
    signDeg: 15.501
    house: 2
    retrograde: true
    stressfulCount: 1
    nonstressfulCount: 7
    aspects[8]{body,aspect,orb,stress,phase}:
      chiron,trine,0.086,nonstressful,separating
      moon,sextile,0.3688,nonstressful,applying
      jupiter,trine,0.6295,nonstressful,applying
      uranus,septile,1.4168,nonstressful,applying
      neptune,sextile,1.6681,nonstressful,separating
      mars,biquintile,1.8737,nonstressful,applying
      sun,biquintile,1.8903,nonstressful,applying
      venus,opposition,2.276,stressful,applying
  ppp:
    sign: Taurus
    lon: 45.501
    signDeg: 15.501
    house: 8
    active: true
    separation: 82.62
    aspects[5]{body,aspect,orb}:
      chiron,sextile,0.086
      moon,trine,0.3688
      jupiter,sextile,0.6295
      neptune,trine,1.6681
      venus,conjunction,2.276
  midpoint:
    lon: 266.8096
    sign: Sagittarius
    signDeg: 26.8096
    house: 3
  antiMidpoint:
    lon: 86.8096
    sign: Gemini
    signDeg: 26.8096
    house: 9
  nodalAxis:
    north:
      sign: Aquarius
      lon: 308.1182
      signDeg: 8.1182
      house: 5
      ruler: uranus
      rulerPlacement:
        body: uranus
        sign: Capricorn
        signDeg: 8.3463
        house: 4
        motion: retrograde
      aspects[4]{body,aspect,orb,stress}:
        uranus,semisextile,0.2281,nonstressful
        mars,sextile,0.4909,nonstressful
        venus,square,5.1068,stressful
        pluto,square,7.3828,stressful
    south:
      sign: Leo
      lon: 128.1182
      signDeg: 8.1182
      house: 11
      ruler: sun
      rulerPlacement:
        body: sun
        sign: Gemini
        signDeg: 19.6107
        house: 9
        motion: direct
      aspects[5]{body,aspect,orb,stress}:
        uranus,quincunx,0.2281,stressful
        mars,trine,0.4909,nonstressful
        mercury,quintile,1.9758,nonstressful
        venus,square,5.1068,stressful
        pluto,square,7.3828,stressful
    motion: retrograde
    skippedSteps: []
  phase: Full
  dispositorChains:
    pluto[1]{body,sign,ruler}:
      pluto,Scorpio,pluto
    southNodeRuler[3]{body,sign,ruler}:
      sun,Gemini,mercury
      mercury,Taurus,venus
      venus,Taurus,venus
    northNodeRuler[2]{body,sign,ruler}:
      uranus,Capricorn,saturn
      saturn,Capricorn,saturn
  prenatalEclipses:
    solar:
      tMax: 2447918.3128
      type: annular
      lon: 306.5899
      sign: Aquarius
      signDeg: 6.5899
      house: 5
    lunar:
      tMax: 2447932.2994
      type: total
      lon: 141.2294
      sign: Leo
      signDeg: 21.2294
      house: 11
  patterns[6]:
    - bodies[4]: chiron,moon,pluto,venus
      apex: null
      sign: null
      house: null
      orb: 2.3619
      type: mystic_rectangle
    - bodies[4]: chiron,neptune,pluto,venus
      apex: null
      sign: null
      house: null
      orb: 2.3619
      type: mystic_rectangle
    - bodies[4]: jupiter,moon,pluto,venus
      apex: null
      sign: null
      house: null
      orb: 2.276
      type: mystic_rectangle
    - bodies[4]: jupiter,neptune,pluto,venus
      apex: null
      sign: null
      house: null
      orb: 2.276
      type: mystic_rectangle
    - bodies[4]: moon,neptune,saturn,uranus
      apex: null
      sign: Capricorn
      house: null
      orb: 0
      type: stellium
      element: earth
      modality: cardinal
    - bodies[4]: moon,neptune,saturn,uranus
      apex: null
      sign: null
      house: 4
      orb: 0
      type: stellium_house
  signature:
    hemispheres:
      eastern: 2
      western: 8
      northern: 5
      southern: 5
    quadrants:
      q1: 1
      q2: 4
      q3: 4
      q4: 1
    elements:
      fire: 1
      earth: 6
      air: 1
      water: 2
    modalities:
      cardinal: 6
      fixed: 3
      mutable: 1
  houseRulers[12]{house,sign,ruler}:
    1,Libra,venus
    2,Scorpio,pluto
    3,Sagittarius,jupiter
    4,Capricorn,saturn
    5,Aquarius,uranus
    6,Pisces,neptune
    7,Aries,mars
    8,Taurus,venus
    9,Gemini,mercury
    10,Cancer,moon
    11,Leo,sun
    12,Virgo,mercury
  counts:
    plutoAspects: 8
    nodeAspects: 9
    skippedSteps: 0
    eclipses: 2
  method: "orbs PLUTO_ASPECTS: 10° conjunction/opposition, 8° square/trine, 6° sextile, 3° semisextile/semisquare/sesquiquadrate/quincunx, 2° septile/quintile/biquintile; ppp: major aspects only (orb 5°); skipped: squares to the nodal axis (orb 5°); ppp inactive when pluto conjunct the north node (orb 10°)"
```

## 6. Decisiones abiertas (D1–D9)

Resueltas en grilling (2026-08-18):

- **D1 — summary**: **eliminado** (decisión del usuario). El output publica solo `chart` (+ `help` del framework en errores). No se publica ningún digest de conteos.
- **D2 — marco**: `houseSystem: "porphyry"` + `zodiac: "tropical"` como **escalares de `chart`** (greppable).
- **D3 — eco `birth`**: forma exacta del perfil v2 almacenado (claves `id`, `name?`, `birthPlace`, `birthDateTime`, `birthLat`, `birthLon`, `birthJdUt`; jdUt 6, coords 4). Convención v2 "publicar = lo almacenado" (`toonProfile`).
- **D4 — `bodies`**: **set v1 completo** `{lon, sign, signDeg, house, retrograde, speed, lat, dist, ra, dec, dignities}`.
- **D5 — midpoint/antiMidpoint**: **estructurados** `{lon, sign, signDeg, house}` (ver §5).
- **D6 — conteos de Plutón**: nombres v1 `stressfulCount` / `nonstressfulCount` (fidelidad de port).
- **D7 — `patterns`**: **omitir claves ausentes** (mystic_rectangle publica solo `{type, bodies, orb}`; stellium lleva `sign`/`element`/`modality` etc. cuando existen). El shape varía por patrón — TOON lee presencia de clave.
- **D8 — `houseRulers`**: **se publica** (12 filas `{house, sign, ruler}` derivado de `cusps` + `SIGN_RULERS`).
- **D9 — `method`**: **escalares + method** — el método publicado extiende el texto v1 con el marco completo (tropical, casas Porphyry por ángulos, topocéntrico, solo true node) + los orbes JWGEA.

La muestra de la §5 (sin `summary`) es el **shape objetivo**.