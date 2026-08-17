# 8. Bloque `evo` navegable para el LLM: atoms, counts, method y precisión

* Status: accepted
* Deciders: Erick
* Date: 2026-08-17

## El norte

¿Sirve a mi Nodo Norte (Leo, casa 10, conj. MC — aplicar la astrología
evolutiva con otros)? Sí — el bloque `evo` es el material que el agente
interpreta; si sus números son crudos, sus criterios invisibles y sus hechos
incompletos, la conversación de aprendizaje tropieza justo donde debe brillar.

## Contexto

- El audit de `chart natal --evo` (Erik 1981-01-26 00:51) confirmó la geometría
  pero expuso que el output del bloque `evo` decepciona como superficie para un
  LLM:
  1. `pluto.lon = 204.3456783846121` (16 dígitos) mientras la carta base usa
     4 decimales, y el propio bloque es incoherente (`ppp.signDeg` redondeado,
     `pluto.signDeg` crudo).
  2. `interpretationContext` (los átomos factuales que el agente razona) cubre
     solo la carta base; con `--evo` el agente no recibe átomos de PPP, fase,
     nodos, skipped steps, midpoints ni eclipses.
  3. `ppp.active: false` no publica la causa (Plutón conj. Nodo Norte ≤ 10°) ni
     la separación angular que también explica los orbes anchos.
  4. Los criterios de cálculo (orbes `PLUTO_ASPECTS`, PPP solo mayores 5°,
     skipped = cuadraturas 5°) viven en help/glosario, no en el output.
  5. `summary` no puentea con `evo`: dos fuentes de verdad sin counts.
- AXI favorece salidas autocontenidas y agregados precomputados.

## Decisión

- **Precisión**: `buildEvo` redondea `lon`/`signDeg` de pluto/ppp/north/south a
  4 decimales en la frontera TOON, igual que `projectBodies`. Core queda crudo.
- **PPP autocontenido**: `evo.ppp.separation` (separación Plutón–NN, 2 dp) y
  `evo.ppp.reason` solo cuando `active: false`.
- **Atoms evo**: nueva función pura `generateEvoAtoms` en `core/classical.ts`;
  sus átomos se fusionan a `interpretationContext.atoms` con `--evo`. Cero
  interpretación: identificadores factuales deterministas.
- **Disclosure in-block**: `evo.method` — una línea factual con orbes y
  criterios.
- **Puente de counts**: `evo.counts` { plutoAspects, nodeAspects, skippedSteps,
  eclipses }.
- **Navegación plana**: el bloque mantiene llaves planas y orden canónico
  (pluto → ppp → midpoint → antiMidpoint → nodalAxis → phase → dispositorChains →
  prenatalEclipses → counts → method). No se reintroduce "soul" como sub-bloque.
- **`--bodies` es aditivo**: el guard de `CALCULATION_ERROR` queda como red de
  seguridad con mensaje honesto (los flags no excluyen Plutón/nodos).

## Consecuencias

- `interpretationContext` crece solo con `--evo`; sin flag queda idéntico.
- El contrato `evo` se documenta en DOMAIN/demo al target (datos de Erik).
- Tests: contratos de precisión, separation/reason, counts/method y átomos evo.
- SPEC §6.1 recalibra el conteo de tests.

## Alternativas

- Sub-bloques `evo.soul`/`evo.nodal`: reintroduce la palabra evitada del
  glosario y rompe consumidores actuales; el plano ordenado logra lo mismo.
- Dejar la precisión en core: contamina el cálculo puro; la frontera TOON ya es
  el patrón del repo (`projectBodies`).
- Átomos como bloque aparte de `interpretationContext`: duplica el surface
  factual; fusionar a `atoms` mantiene un único contrato de hechos.