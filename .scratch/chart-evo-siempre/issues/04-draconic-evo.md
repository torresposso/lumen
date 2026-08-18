---
id: 04-draconic-evo
type: task
status: resolved
blockers: [01]
---

**¿Sirve a mi Nodo Norte?** Sí — leer la carta draconic con su mecánica
recalculada en el mismo marco es la práctica real del canon: una sola llamada,
misma aritmética, otro zodíaco.

## Objetivo

Cablear el bloque `evo` draconic (ADR-0014): cuando `request.options.draconic`
es true, la lectura alimenta la mecánica con cuerpos/casas draconic y Nodo
Norte = 0; los eclipses se proyectan por la misma resta del Nodo; `method`
declara el marco draconic y sus constantes.

## Tareas

1. `src/core/nodes.ts`: `computePrenatalEclipses(..., eclipseShiftLon?)` —
   cuando se pasa, el `lon` del eclipse se desplaza (`lon − eclipseShiftLon`)
   antes de proyectarlo contra las cusps de entrada (marco draconic).
2. `src/core/evolutionary-reading.ts`: entradas `eclipseShiftLon?` y
   `frameDisclosure?`; pasan la primera a `computePrenatalEclipses`; `method`
   compone `describeEvoCriteria()` + `frameDisclosure` cuando llega.
3. `src/core/classical.ts`: constante `DRACONIC_FRAME_DISCLOSURE` (marco y
   constantes del eje nodal draconic, para que el agente no lea valía-constante
   como información variable), junto a la proyección draconic.
4. `src/core/reading.ts`: en modo draconic, el par
   `(bodies, cusps, eclipseShiftLon, frameDisclosure)` para
   `computeEvolutionaryReading` sale de `toDraconicChart` (bodies draconic,
   cusps draconic, shift = lon del Nodo natal); en modo natal, el par actual.
5. Tests — suite nueva para el bloque evo draconic:
   - Secciones constantes: north `lon 0 / Aries`, south `lon 180 / Libra` para
     cualquier Nodo natal (mock determinista).
   - Eclipses proyectados (lon desplazado por la resta del Nodo).
   - `method` declara el marco draconic; el natal no.
   - Integración con caelus (comando chart draconic): evo presente y recalculado
     sobre el zodíaco draconic.

## Criterios de aceptación

- `lumen chart draconic <profile>` publica `chart` + `draconic` + `evo`
  recalculado + `interpretationContext` con los átomos del marco draconic.
- `evo.nodalAxis.north` = 0° Aries por construcción; `method` contiene el
  disclosure del marco.
- El bloque sigue siendo puramente geométrico (regla inamovible).
- `bun test` + `bun run typecheck` en verde.

## Comments

- 2026-08-17: abierto por pi; desbloqueado al resolver 01.
- 2026-08-17: resuelto por pi.

## Answer

- `src/core/nodes.ts`: `computePrenatalEclipses(..., eclipseShiftLon?)` — el
  lon del eclipse se desplaza (`lon − shift`) antes de proyectar contra las
  cusps de entrada.
- `src/core/evolutionary-reading.ts`: entradas `eclipseShiftLon?` y
  `frameDisclosure?`; pasan al cálculo de eclipses; `method` compone
  `describeEvoCriteria() + "; " + frameDisclosure`.
- `src/core/classical.ts`: `DRACONIC_FRAME_DISCLOSURE` junto a la proyección.
- `src/core/reading.ts`: en modo draconic el par (bodies, cusps,
  eclipseShiftLon, frameDisclosure) sale de `toDraconicChart`; en modo natal el
  par clásico.
- Tests: suite nueva `tests/core/draconic-evo.test.ts` (eje fijo para cualquier
  Nodo, pluto recalculado sobre el zodíaco draconic, eclipses proyectados,
  method con el marco en draconic y sin él en natal, integración caelus con
  `north_node_ruler_mars`); chart.test draconic al target (evo recalculado,
  method con disclosure). El bloque sigue siendo puramente geométrico.

Estado: `bun test` 193/695, typecheck y check verdes. Desbloqueado el 05.