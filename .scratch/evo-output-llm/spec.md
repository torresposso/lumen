# Evo Output para LLM: bloque navegable, hechos completos y disclosure

> **Estado**: Implementado y verificado — audit re-corrido en verde (167 tests, 560 expect).
> **Origen**: Audit de congruencia de `chart natal --evo` (Erik 1981-01-26 00:51) —
> blindspots S1/S4/S5/S6/S7/S8/S9 del informe `blindspot-audit`.
> **Datos de referencia**: Erik, 1981-01-26 00:51, Magangué (lat 9.24202, lon -74.75467, America/Bogota).

## Decisiones propuestas

1. **S1 — Precisión 4 dp**: `buildEvo` redondea en la frontera TOON (como
   `projectBodies`) `pluto.lon/signDeg`, `ppp.lon/signDeg` y
   `nodalAxis.north/south.lon/signDeg`. Core conserva precisión cruda.
2. **S6 — PPP autocontenido**: `evo.ppp.separation` (separación angular
   Plutón–Nodo Norte, 2 dp) siempre que el nodo esté disponible;
   `evo.ppp.reason` ("pluto conjunct north node (<=10°)") solo cuando
   `active: false`.
3. **S5 — Átomos del evo**: nueva función pura `generateEvoAtoms` en
   `core/classical.ts`; con `--evo` sus átomos se fusionan a
   `interpretationContext.atoms` después de los átomos base. Cero interpretación:
   solo identificadores factuales.
4. **S7 — Disclosure en runtime**: `evo.method` (una línea factual) con los
   criterios: orbes `PLUTO_ASPECTS`, PPP solo aspectos mayores (orbe 5°),
   skipped = cuadraturas al eje nodal (orbe 5°), PPP inactivo con Plutón
   conj. Nodo Norte (orbe 10°).
5. **S8 — Puente summary↔evo**: `evo.counts` { plutoAspects, nodeAspects,
   skippedSteps, eclipses }.
6. **S4 — Contrato muerto**: aclarar en docs que `--bodies` es aditivo (extra
   bodies: mean_lilith, true_lilith) y no excluye Plutón/nodos; el guard de
   `CALCULATION_ERROR` queda como red de seguridad con mensaje honesto.
7. **Navegación**: el bloque `evo` mantiene llaves planas (no sub-bloques
   `soul`/`nodal`, que reintroducirían la palabra evitada del glosario) y
   orden canónico: pluto → ppp → midpoint → antiMidpoint → nodalAxis → phase →
   dispositorChains → prenatalEclipses → counts → method.

## Contrato esperado tras los fixes (datos de Erik)

```text
evo:
  pluto:
    lon: 204.3457            # redondeado (antes crudo)
    sign: Libra
    signDeg: 24.3457         # redondeado
    house: 12
    retrograde: false
    stressfulCount: 2
    nonstressfulCount: 3
    aspects[5]{body,aspect,orb,stress,phase}: ...
  ppp:
    lon: 24.3457             # redondeado
    sign: Aries
    signDeg: 24.3457
    house: 6
    active: true
    separation: 73.44        # nuevo — Plutón–NN en grados
    aspects[3]{body,aspect,orb}: ...
  midpoint:      "Virgo 17°38' (H10)"
  antiMidpoint:  "Pisces 17°38' (H4)"
  nodalAxis:
    north:
      lon: 130.9058          # redondeado
      sign: Leo
      signDeg: 10.9058       # redondeado
      house: 9
      ruler: sun
      rulerPlacement: {...}
      aspects[8]: [...]
    south:
      lon: 310.9058
      sign: Aquarius
      signDeg: 10.9058
      house: 3
      ruler: uranus
      rulerPlacement: {...}
      aspects[8]: [...]
    motion: direct
    skippedSteps[1]{body,aspect,orb}: chiron,square,2.5025
  phase: Disseminating
  dispositorChains: { pluto[3], southNodeRuler[4], northNodeRuler[5] }
  prenatalEclipses:
    solar:  { tMax, type: annular, lon, sign: Leo, signDeg: 18.2796, house: 10 }
    lunar:  { tMax, type: penumbral, lon, sign: Leo, signDeg: 0.2748, house: 9 }
  counts:                    # nuevo — puente summary↔evo
    plutoAspects: 5
    nodeAspects: 16
    skippedSteps: 1
    eclipses: 2
  method: "orbs PLUTO_ASPECTS (conj/opos 10°, cuadr/trí 8°, sextil 6°, menores 2-3°); ppp solo aspectos mayores (orbe 5°); skipped = cuadraturas al eje nodal (orbe 5°); ppp inactivo si Plutón conj. Nodo Norte (orbe 10°)"

interpretationContext:
  atoms[79+N]:   # átomos evo añadidos tras los base (hechos, no lectura)
    #   ppp_sign_aries, ppp_house_6, ppp_active,
    #   pluto_nn_separation_73_44, pluto_nn_midpoint_virgo_17,
    #   pluto_nn_antimidpoint_pisces_17, sol_luna_phase_disseminating,
    #   north_node_ruler_sun, south_node_ruler_uranus,
    #   north_node_aspects_8, south_node_aspects_8, nodal_motion_direct,
    #   pluto_aspects_5, pluto_stressful_aspects_2, pluto_nonstressful_aspects_3,
    #   skipped_steps_1, skipped_chiron_square,
    #   solar_eclipse_annular_leo_18, lunar_eclipse_penumbral_leo_0
```

## Criterios de cierre

- `bun test`, `bun run typecheck` y `bun run check` (con `check:docs`) en verde;
  SPEC §6.1 recalibrado.
- Para Erik: `evo.pluto.lon = 204.3457`, `north.lon = 130.9058`,
  `ppp.separation = 73.44`; `counts = {5, 16, 1, 2}`; `method` presente; los
  átomos evo presentes en `interpretationContext`.
- `bun test` cuenta nueva: recalibrada en SPEC §6.1 (ticket `06-tests`).
- El audit queda `resolved` con el reporte actualizado (ticket `07-audit`).