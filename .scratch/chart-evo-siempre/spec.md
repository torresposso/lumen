# Chart evo siempre — spec de la cadena

> **Origen**: grill del capitán (2026-08-17) + revisión de arquitectura.
> **Decisión**: ADR-0014 — la superficie de `chart` entrega la mecánica:
> natal siempre, draconic en el canon.
> **Datos de referencia**: Erik, 1981-01-26 00:51, Magangué
> (lat 9.24202, lon -74.75467, America/Bogota).

## Contrato target

### `chart natal <profile>`

Sin flags extra (solo los de intake: `--when`, `--place`, `--bodies`,
`--house-system`, etc.): publica **siempre**

1. `chart` — la carta base (como hoy, sin cambios de shape).
2. `evo` — el bloque evolutivo completo (igual al de `chart natal --evo` hoy:
   pluto → ppp → midpoint → antiMidpoint → nodalAxis → phase →
   dispositorChains → prenatalEclipses → counts → method), con orbes
   `PLUTO_ASPECTS` y política de precisión ADR-0011.
3. `interpretationContext` — átomos base + átomos de la mecánica evolutiva.

### `chart draconic <profile>`

Publica **siempre**

1. `chart` — la carta base.
2. `draconic` — la proyección draconic (como hoy).
3. `evo` — el bloque evolutivo **recalculado sobre el zodíaco draconic**:
   - cuerpos de entrada: cuerpos draconic (`toDraconicChart`).
   - casas de entrada: casas draconic.
   - Nodo Norte de entrada: **0** (por construcción de la proyección).
   - eclipses: los prenatales natales, proyectados por la resta del Nodo Norte
     (longitud eclipse − longitud NN; mecánico).
4. `interpretationContext` — átomos base + átomos evolutivos en el marco
   draconic.

### Reglas del bloque evo draconic

- **Secciones constantes**: por construcción, el eje nodal draconic está fijo
  (NN en 0° Aries, SN en 0° Libra; cuadraturas en 0° Cáncer/Capricornio).
  Regentes del eje, skipped steps y separación PPP son constantes para todas
  las cartas.
- **Disclosure**: `method` (derivado de `describeEvoCriteria`) declara
  explícitamente el marco draconic y sus constantes, para que el agente no
  lea valía-constante como información variable.
- **Nada de interpretación**: el bloque sigue siendo puramente geométrico
  (regla inamovible).

### Core

- `computeReading(request, ephemeris): AstrologicalReading` — sin `selection`,
  sin `undefined`. Invariante: la natal siempre incluye Plutón y el Nodo
  Verdadero (cuerpos por defecto; `--bodies` aditivo); los seams custom de
  test cumplen el contrato.
- Internamente: cuando `request.options.draconic` es true, el cableado de
  lectura alimenta `computeEvolutionaryReading` con cuerpos/casas draconic y
  Nodo Norte = 0 (hoy alimenta los natales siempre).

### Gramática

- `--evo` desaparece: `parseEvoFlag`, el rechazo de draconic y las menciones
  de la flag en usages/docs se eliminan. `chart draconic --evo` deja de tener
  objeto (la flag no existe).

## Cableado (notas de implementación, verificables al construir)

1. `src/core/reading.ts`: `computeReading(request, ephemeris)` — condicional
   `options.draconic` para elegir el par (bodies, cusps, northNodeLon) que
   alimenta `computeEvolutionaryReading`; el resto del ensamblaje no cambia.
2. `src/commands/chart.ts`: sin `parseEvoFlag`, sin rama `undefined` →
   `CALCULATION_ERROR`; `computeReading` devuelve siempre lectura.
3. `src/core/charts.ts`: mantener la invariante natal (plutón + nodo verdadero
   en cuerpos por defecto); assert defensivo si un seam custom la violara.
4. `src/core/evolutionary-reading.ts`: verificar que `computePrenatalEclipses`
   acepta un offset de proyección o se proyecta su salida al final del
   cableado draconic.
5. Tests: chart/reading/output-projection/intake actualizan su superficie;
   suite nueva para el bloque evo draconic (con la expectativa de secciones
   constantes y method declarando el marco).

## Criterios de aceptación de la cadena

- `bun test` y `bun run typecheck` en verde; conteos recalibrados en SPEC §6.1
  al cierre.
- `bun run check` (biome + check:docs) verde al cierre (rojo a propósito
  durante la transición doc-first).
- `lumen chart natal erik` y `lumen chart draconic erik` entregan el contrato
  de arriba sin flags.
- Gramática sin `--evo` en ningún usage ni doc vivo; `grep --evo` solo
  encuentra el registro histórico (ADR-0007, ADR-0014).
