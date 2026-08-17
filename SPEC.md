# Especificación de Lumen: CLI AXI de Astrología Evolutiva

## 1. Norte (una frase)

> **Lumen es mi instrumento de evolución: leo mi propia carta y las de mi
> familia, aprendo astrología evolutiva practicándola, y con ese aprendizaje
> aprendo a brillar en mi Nodo Norte en Leo (casa 10, conjunción MC) — para
> después aplicarlo con los demás. Preguntarle al agente debe ser tan barato
> que aprender sea conversación, no análisis.**

La astrología evolutiva es la tradición: dos lentes de un mismo canon — el
Plutón de Green (el Alma y su punto evolutivo) y el eje nodal de Forrest (la
historia kármica). La elección de lente la resuelve la práctica, no el
análisis. AXI es el contrato, no el producto: si el agente tropieza con lumen,
tropieza Erick. La enseñanza sale por la conversación con el agente; lumen se
mantiene geométrico y TOON-mínimo.

## 2. Fronteras (inamovibles)

| Capa | Responsabilidad | Prohibido |
|---|---|---|
| `src/core/` (8 módulos puros) | Cálculo astrológico determinista | I/O, zod, AxiError, imports de adapters/storage/commands |
| `src/adapters/` | Red y efemérides (Open-Meteo, Caelus) | Lógica de dominio |
| `src/storage/` | Persistencia XDG (`0600`, escritura atómica) | Cálculo |
| `src/commands/` | Parseo, llamado a core, salida TOON | Cálculo astrológico |
| `src/cli.ts` | Router axi-sdk-js, Home | Lógica de negocio |

La validación zod vive únicamente en el seam de intake (`src/commands/intake.ts`).
La salida siempre es tipos nativos caelus convertidos a TOON en la frontera.

## 3. Superficie de comandos (la única que existe)

5 comandos + Home, organizados por las preguntas del practicante. Sin aliases,
sin comandos ocultos, sin retrocompatibilidad que contamine `--help`:

```
journey    ¿Qué me está pasando ahora? Progresiones secundarias y estaciones
karma      ¿Cómo se aplica con otros? Sinastría evolutiva
profile    Los seres de la práctica: perfiles locales de nacimiento (privacidad 0600, lumen.db)
chart      Carta: natal (insumo base, con mecánica opt-in `--evo`) y draconic (experimento etiquetado)
setup      Integración de sesión (hooks + skill) — conveniencia, no producto
```

La mecánica evolutiva (Plutón/PPP y eje nodal) vive en `chart natal --evo` como
bloque geométrico opt-in, sin interpretación. El bloque `evo` es navegable para
el agente: llaves planas en orden canónico (pluto → ppp → midpoint →
antiMidpoint → nodalAxis → phase → dispositorChains → prenatalEclipses →
counts → method), grados redondeados a 4 decimales como la carta base, `counts`
(puente numérico con `summary`) y `method` (disclosure factual de orbes y
criterios, derivado mecánicamente de las tablas de core — imposible que diverja
del cálculo). Con `--evo` los átomos de `interpretationContext` incluyen la
mecánica evolutiva.

`chart draconic` es puramente
geométrico y rechaza `--evo`. Fuera de la superficie (helenístico/técnico,
fuera del canon evolutivo — ver ADR-0004 y
`~/knowledge/research/2026-08-12--tradicion-astrologia-evolutiva.md`):
sinastría clásica (la evolutiva vive en `karma pair`), lotes herméticos y
estrellas fijas. Los eclipses prenatales son eventos nodales y se entregan
dentro del bloque `evo` de `chart natal --evo`.

## 4. Definición de Terminado (checklist AXI)

1. **TOON en stdout**; nada más. Logs y progreso a stderr.
2. **Schemas mínimos**: listas ≤ 4 campos, `--fields` para más, límites altos.
3. **Truncación**: campos largos truncados (500–1500 chars) con tamaño total y escape hatch.
4. **Agregados precomputados**: `count` total en listas, estado derivado barato inline.
5. **Vacíos definitivos**: "0 X found" con contexto; nunca salida ambigua.
6. **Errores estructurados en stdout** (AxiError): mensaje + `help` accionable; exit 0 para no-ops, 1 error, 2 uso; flags desconocidos rechazados con hint; `--help` siempre pasa.
7. **Contexto ambiente**: `setup hooks` idempotente (Claude Code, Codex, OpenCode) + skill instalable generada del Home, con `--check` de staleness.
8. **Content first**: Home sin argumentos muestra estado vivo (perfiles) + `bin:` y `description:`.
9. **Disclosure contextual**: `help[]` con siguientes pasos relevantes, placeholders `<id>`, omitido si la salida es autocontenida. El bloque `evo` es autocontenido y lleva su disclosure en un campo `method` propio (orbes y criterios), no en `help[]`; el texto del `method` se deriva de las tablas de core (`describeEvoCriteria`), nunca se escribe a mano.
10. **Help consistente**: `--help` por comando con flags, defaults y 2-3 ejemplos; `--version`/-v/-V vía fast-path en <ms (hoja `src/version.ts`).

## 5. Regla de congelación (la cura del rumbo)

**Toda decisión de alcance — agregar, cortar, refactorizar, o el impulso de
borrar y rehacer — se juzga con una sola pregunta: ¿sirve a mi Nodo Norte?
Si la respuesta no es un sí sentido, la decisión es no.**

- Cambiar el norte (sección 1) requiere ADR.
- Todo ticket en `.scratch/` responde esa pregunta en su primera línea; si un
  ticket no puede nombrar cómo sirve a la evolución, no se construye.
- La superficie solo crece con ticket que nombre un hueco de valor
  evolutivo concreto. Mover archivos "para ordenar" está prohibido.
- El impulso de rehacer de cero es la voz del Nodo Sur (Acuario, casa 4); la
  medicina es mantener, usar, mostrar.

## 6. Criterios de Aceptación

1. `bun test` en verde (174 tests, 601 expect) y `bun run typecheck` sin
   errores; el conteo se recalibra solo vía tickets de remoción con ticket del
   norte.
2. `bun run check` (biome) con 0 errores y 0 warnings.
3. `src/core/` sin I/O, zod, AxiError ni imports fuera de core/caelus.
4. La superficie de comandos es exactamente la de la sección 3.
5. Auditoría AXI de la sección 4 pasa sin violaciones abiertas.
6. Cada ticket de `.scratch/` responde la pregunta del norte en su primera línea.
