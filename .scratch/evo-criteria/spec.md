# Evo criteria: disclosure derivado y separación desde core (deepening A)

> **Estado**: Diseño cerrado (grilling A, rondas 1-2, 8 decisiones) — pendiente de implementar.
> **Origen**: Reporte de arquitectura `/improve-codebase-architecture`
> (`/tmp/architecture-review-20260817.html`, candidato A) + code-review de
> `evo-output-llm`: la misma decisión (orbes/deactivación/separation/reason)
> re-encodada en 4 sitios.

## Problema

El bloque `evo` re-encoda los criterios que core ya posee:

- `soul.ts:287` calcula `angularDistance(pluto.lon, northNodeLon) <= 10`
  (literal) para `ppp.active` y **descarta la distancia**.
- `chart.ts:489-493` **recalcula** la separación para `ppp.separation`, con un
  fallback `true_node ?? north` que puede diferir de la medida de la regla.
- `chart.ts:523` `reason` con literal `(<=10°)`, re-encodando el umbral.
- `chart.ts:236-237` `EVO_METHOD_DISCLOSURE` (prosa) re-encoda `PLUTO_ASPECTS`,
  PPP mayores 5°, skipped 5° y deactivación 10° a mano.
- `nodes.ts:104/162` el orbe de skipped es el literal `orbLimit = 5`.
- `buildEvo` computa `soul.pluto.aspects.length` dos veces (counts + input de
  atoms).

## Decisiones (grilling, rondas 1-2)

1. **D1 — Método derivado**: el disclosure `method` se deriva mecánicamente de
   las tablas/constantes de core; no puede divergir del cálculo. La prosa
   `EVO_METHOD_DISCLOSURE` desaparece.
2. **D2 — Separación desde core**: `computeSoulReading` devuelve
   `plutoNorthNodeSeparation?` (la medida que ya calcula, cruda). `chart.ts` solo
   redondea y publica. Se elimina el fallback `true_node ?? north`: el número
   publicado es el mismo que decidió `ppp.active` (referencia = Nodo Verdadero).
3. **D3 — Constantes nombradas**: `PPP_DEACTIVATION_ORB = 10` (soul.ts) y
   `SKIPPED_STEPS_ORB = 5` (nodes.ts) exportadas como única fuente (regla +
   razón + método).
4. **D4 — Alcance**: reglas + dedup de counts→atoms dentro de `buildEvo`; la
   interfaz pública de `generateEvoAtoms` **no** cambia. B (extraer engine) queda
   como candidato aparte.
5. **D5 — Formato del method**: agrupado por orbe descendente, en inglés
   (identificadores del bloque):
   `"orbs PLUTO_ASPECTS: 10° conjunction/opposition, 8° square/trine, 6° sextile, 3° semisextile/semisquare/sesquiquadrate/quincunx, 2° septile/quintile/biquintile; ppp: major aspects only (orb 5°); skipped: squares to the nodal axis (orb 5°); ppp inactive when pluto conjunct the north node (orb 10°)"`.
6. **D6 — Ubicación**: `describeEvoCriteria(): string` pura en
   `core/classical.ts` (sin archivo nuevo, junto a los átomos evo); importa las
   tablas/constantes de soul/nodes sin ciclos.
7. **D7 — Reason autocontenido**:
   `"pluto conjunct north node (separation {sep}° <= {10}°)"` — la separación
   medida incluida (siempre definida cuando inactive, por construcción); fallback
   solo-umbral si `separation` fuera `undefined`.
8. **D8 — Tests**: `describeEvoCriteria()` (agrupación, determinismo,
   live-derivation), separación en soul, y chart-level con mock ephemeris para
   `ppp.active:false` (+ reason + atoms + method).

## Contrato target

- `evo.ppp.separation` pasa a ser opcional en el tipo (`separation?: number`):
  presente cuando existe la referencia de la regla (Nodo Verdadero) — el estado
  natal por defecto. En el edge teórico sin Nodo Verdadero, ausente (no se
  evalúa → `active: true`, coherente).
- `evo.ppp.reason` solo con `active: false`, con la separación medida.
- `evo.method` = string derivado D5 (grouping por orbe desc, todas las fuentes
  de core, longitud 296 chars — dentro del rango AXI de truncación).
- `counts` y `atoms`: sin cambio de forma.

## Criterios de cierre

- `bun test` (conteo recalibrado en SPEC §6.1), `bun run typecheck` y
  `bun run check` (con `check:docs`) en verde.
- `check:docs` verde en todo momento: la superficie (SPEC §3) y el árbol
  (`DOMAIN.md`/`domain.md`) **no cambian** (ningún archivo nuevo en `src/`).
- Erik (1981-01-26 00:51): `evo.ppp.separation = 73.44`, `active: true` sin
  `reason`, `method` = string derivado.