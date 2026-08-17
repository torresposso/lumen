---
id: 03-disclosure
type: task
status: resolved
blockers: [02-core-separation]
---

**¿Sirve a mi Nodo Norte?** Sí — el disclosure mecánico es la cura del drift: el
agente lee los orbes reales derivados de las tablas, no una prosa que envejece
(D1/D5/D6/D7).

## Objetivo

`describeEvoCriteria()` pura en core; `method` y `reason` derivados; elimina
`EVO_METHOD_DISCLOSURE`.

## Cambios

1. `src/core/classical.ts`:
   - `export function describeEvoCriteria(): string` — pura, sin argumentos.
     Deriva de `PLUTO_ASPECTS` (agrupados por orbe, orden descendente, nombres en
     orden de la tabla), `PPP_MAJOR_ASPECTS` (orbe de la tabla), `SKIPPED_STEPS_ORB`
     (nodes) y `PPP_DEACTIVATION_ORB` (soul). Imports desde `./soul` y `./nodes`;
     ningún módulo importa `classical` → sin ciclos.
   - Formato D5 (inglés): `orbs PLUTO_ASPECTS: 10° conjunction/opposition, 8°
     square/trine, 6° sextile, 3° semisextile/semisquare/sesquiquadrate/quincunx,
     2° septile/quintile/biquintile; ppp: major aspects only (orb 5°); skipped:
     squares to the nodal axis (orb 5°); ppp inactive when pluto conjunct the
     north node (orb 10°)`.
2. `src/commands/chart.ts`:
   - Eliminar `EVO_METHOD_DISCLOSURE`; `method: describeEvoCriteria()`.
   - `reason` derivado (D7): cuando `active: false`,
     `"pluto conjunct north node (separation {sep}° <= {PPP_DEACTIVATION_ORB}°)"`
     con `sep` = separación redondeada (2 dp); fallback solo-umbral si `separation`
     fuera `undefined` (no ocurre por construcción: inactive ⟹ hay Nodo Verdadero).
     Importar `PPP_DEACTIVATION_ORB` desde `./soul`.
   - `EvoOutput.ppp.separation?: number` (opcional; D2 edge teórico).
   - `plutoNorthNodeSeparation` en `buildEvo`: `soul.plutoNorthNodeSeparation`
     redondeado a 2 dp, sin fallback al north-node reportado.
3. Tests: `tests/core/classical.test.ts` — `describeEvoCriteria()`:
   agrupación (cada grupo `{orb}° ...` presente), orden (10 antes que 8…),
   determinismo (dos llamadas idénticas), live-derivation (cada orbe de
   `PLUTO_ASPECTS` aparece en el string).

## Answer
- `classical.ts`: `describeEvoCriteria()` pura (imports de soul/nodes, sin ciclos);
  grouping por orbe desc con guard-throw (patrón de `types.ts`), sin `!`.
- `chart.ts`: se elimina `EVO_METHOD_DISCLOSURE`; `method: describeEvoCriteria()`;
  `reason` derivado con la separación medida y `PPP_DEACTIVATION_ORB`;
  `EvoOutput.ppp.separation?: number`; separación republish desde
  `soul.plutoNorthNodeSeparation` (round 2 dp, sin fallback); `angularDistance`
  ya no se importa.
- Tests: classical.test.ts (agrupación, live-derivation, determinismo, criterios).
- Verificado con Erik: `method` = string D5 exacto, `active: true`,
  `separation: 73.44`, sin `reason`, atoms[98].
- Gate: 172 pass / 589 expect, typecheck y `check` (biome + check:docs) verdes.

## Criterios de aceptación

- `bun test` y `bun run typecheck` verdes.
- `chart.test.ts` existente sigue pasando: `method` contiene `PLUTO_ASPECTS`
  (el prefijo "orbs PLUTO_ASPECTS:" lo garantiza).