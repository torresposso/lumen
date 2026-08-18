# 14. La superficie de `chart` entrega la mecánica: natal siempre, draconic en el canon

* Status: accepted
* Deciders: Erick
* Date: 2026-08-17

## El norte

¿Sirve a mi Nodo Norte (Leo, casa 10, conj. MC — aplicar la astrología
evolutiva con otros)? Sí — la práctica de leer mi carta y las de mi familia
siempre quiere la mecánica evolutiva junto a la geometría. Un solo contrato
para la carta y su lectura: `chart natal` y `chart draconic` publican siempre
el bloque `evo`, cada uno recalculado sobre su zodíaco. Quitar el flag elimina
la superficie condicional que serpentea por todo el pipeline y acerca el
instrumento a la pregunta real del practicante: «¿qué dice mi carta?».

## Contexto

* ADR-0007 creó `chart natal --evo` como bloque **opt-in** con dos motivos
  explícitos: AXI favorece default mínimo y llamadas predecibles para el
  agente, y «chart natal sin flags sigue exactamente igual (output actual)».
* La práctica desmiente el opt-in: la carta sin mecánica no se pide nunca.
  El flag solo existe para respetar una doctrina de default mínimo que choca
  con el uso real.
* La condicionalidad del opt-in se reparte por el pipeline: `parseEvoFlag` en
  el comando, el parámetro `selection` de `computeReading`, la rama
  `undefined` → `CALCULATION_ERROR`, el rechazo de `--evo` en `chart draconic`
  y la gramática en cuatro archivos de docs. Cada uno es un punto donde el
  contrato se bifurca.
* La invariante «la carta siempre lleva Plutón y el Nodo Verdadero» es
  estructural: los cuerpos natales por defecto los incluyen y `--bodies` es
  aditivo (solo añade). Con ella, la rama de error del core es código muerto —
  no una decisión de tolerancia.
* CONTEXT.md y la nota del vault
  (`~/knowledge/research/2026-08-12--tradicion-astrologia-evolutiva.md`,
  decisión abierta nº 4, `draconic-gap`) colocan a draconic «fuera del canon»
  como experimento etiquetado. La mecánica evolutiva es puramente geométrica
  en lumen (regla «siempre geométrico, nunca interpretativo»): recalcularla
  sobre el zodíaco draconic no introduce interpretación — la misma aritmética,
  otro marco. La distinción de canon se sostiene sobre la etiqueta, no sobre la
  aritmética.

## Decisión

* **`chart natal <profile>`** publica siempre carta + bloque `evo` + átomos
  evolutivos en `interpretationContext`. `--evo` desaparece de la gramática:
  sin flag, sin `--no-evo`, sin aliases, sin deprecación.
* **`chart draconic <profile>`** entra al canon: publica la carta draconic +
  el bloque `evo` **recalculado sobre el zodíaco draconic** (Plutón/PPP,
  fase Sol-Luna y eclipses proyectados por la misma resta del Nodo Norte) +
  átomos evolutivos en el marco draconic.
* **Eje nodal draconic fijo**: por construcción de la proyección, el Nodo
  Norte está en 0° Aries en toda carta draconic (Sur en 180° Libra,
  cuadraturas en 0° Cáncer/Capricornio). El marco del eje y sus regentes
  (Marte/Venus) son constantes para todas las cartas — no llevan información
  por carta; el `method` (disclosure de `describeEvoCriteria`) lo declara
  explícitamente para que el agente no lea valía-constante como información
  variable. El resto de la mecánica (Plutón/PPP, separación, skipped steps,
  fase, eclipses) sigue los cuerpos de cada carta. *(revisado 2026-08-17:
  la redacción anterior afirmaba que "skipped steps y separación PPP" eran
  constantes — astronómicamente falso; solo el marco del eje y sus regentes
  lo son.)*
* **Core**: `computeReading(request, ephemeris)` devuelve
  `AstrologicalReading` (no-opcional). Se eliminan el parámetro `selection`,
  la rama `undefined` y su traducción en el comando; la invariante «natal
  incluye Plutón y Nodo Verdadero» se mantiene en `charts.ts` (los seams
  custom de test cumplen el contrato).
* **Supersede**: ADR-0007 queda como registro histórico; sus cláusulas
  «opt-in», «chart natal sin flags = output actual» y «chart draconic rechaza
  --evo» quedan superadas por este ADR. ADR-0004 conserva su norte; de su
  lista «fuera de la superficie», draconic sale (permanecen sinastría clásica,
  lotes herméticos, estrellas fijas).

## Consecuencias

* Gramática: `chart natal <profile>` y `chart draconic <profile>` — sin
  `--evo` y sin rechazo que ya no tiene objeto.
* DOMAIN.md, SPEC.md §3/§6.1, CONTEXT.md (entradas *Draconic chart*, *Evo
  block*, *Chart computation*, *Astrological reading*), README.md y
  `docs/agents/domain.md` se reescriben al target en ticket doc-first;
  `check:docs` queda rojo a propósito y vuelve a verde con el cierre de la
  cadena.
* `src/commands/chart.ts` pierde `parseEvoFlag` y la rama de error;
  `src/core/reading.ts` pierde `selection` y el `undefined`; el cableado
  draconic alimenta `computeEvolutionaryReading` con cuerpos/casas draconic y
  Nodo Norte = 0.
* Tests: las suites de chart/reading/output-projection/intake actualizan su
  superficie; la sección §6.1 de SPEC recalibra los conteos (187 tests /
  672 expect hoy; crecerá con el caso draconic-evo) en el ticket de cierre.
* Nota del vault de la tradición: adenda fechada — draconic pasa al canon y la
  decisión abierta nº 4 (`draconic-gap`) queda resuelta al incluir la capa
  aritmética draconic; se valida con `scripts/validate.sh`.
* La revisión de arquitectura (`improve-codebase-architecture`) identificó la
  localidad rota de `describeEvoCriteria` (tablas en `soul.ts`/`nodes.ts`,
  disclosure en `classical.ts`): con evo siempre, ese camino es troncal — se
  atiende en ticket aparte, después de esta cadena (decisión del capitán,
  ronda 2 del grill). Atendido: las tablas y `describeEvoCriteria` viven en
  `src/core/evo-criteria.ts` (una sola fuente, consumida por soul/nodes/evo).

## Alternativas

* **`--no-evo` de escape** (opt-in invertido): conserva toda la condicionalidad
  y añade gramática que la práctica no pide — AXI penaliza exactamente eso.
* **Anexar el bloque evo natal a draconic tal cual**: redundante; no aporta
  información nueva, repite el bloque natal bajo la carta draconic.
* **Mantener draconic fuera del canon**: la etiqueta «experimento» se sostiene
  sin la mecánica; pero la mecánica es aritmética pura y honesta en cualquier
  zodíaco, y el norte pide una sola llamada para la carta y su lectura.
