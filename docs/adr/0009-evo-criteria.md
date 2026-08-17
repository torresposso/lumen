# 9. Criterios del bloque `evo` en una sola fuente: disclosure derivado y separación desde core

* Status: accepted
* Deciders: Erick
* Date: 2026-08-17

## El norte

¿Sirve a mi Nodo Norte (Leo, casa 10, conj. MC — aplicar la astrología
evolutiva con otros)? Sí — el bloque `evo` es el material que el agente
interpreta; si el mismo criterio vive en 4 sitios y uno de ellos drift, la
conversación de aprendizaje tropieza justo donde debe brillar.

## Contexto

- El code-review de `evo-output-llm` (punto fijo `ec90c5a`) y el scan de
  arquitectura expusieron que los criterios del bloque `evo` están re-encodados
  fuera de core:
  1. `soul.ts` calcula `angularDistance(pluto, northNode) <= 10` (literal) para
     `ppp.active` y descarta la distancia; `chart.ts` la recalcula para
     `ppp.separation` con un fallback a mean-node que puede diferir de la regla.
  2. `EVO_METHOD_DISCLOSURE` (prosa en commands) re-encoda a mano los orbes
     `PLUTO_ASPECTS`, PPP mayores 5°, skipped 5° y deactivación 10°.
  3. El orbe de skipped es el literal `orbLimit = 5` en dos firmas de `nodes.ts`.
  4. `buildEvo` computa `soul.pluto.aspects.length` dos veces (counts y atoms).
- Core ya emite presentación formateada (`midpoint.formatted`,
  `rulerPlacement.description`); el disclosure de criterios es la misma familia
  y debe vivir con los datos que describe.

## Decisión

- **Método derivado**: `describeEvoCriteria(): string` pura en
  `core/classical.ts` serializa `PLUTO_ASPECTS` (agrupados por orbe,
  descendente), PPP mayores, `SKIPPED_STEPS_ORB` y `PPP_DEACTIVATION_ORB`.
  `evo.method` la llama; el texto no puede divergir del cálculo.
- **Separación desde core**: `computeSoulReading` devuelve
  `plutoNorthNodeSeparation` (cruda, la medida que decide la regla). `chart.ts`
  solo redondea y publica; desaparece el fallback `true_node ?? north`.
  `evo.ppp.separation` pasa a ser opcional: presente cuando existe la referencia
  de la regla (Nodo Verdadero) — el estado natal por defecto.
- **Constantes nombradas**: `PPP_DEACTIVATION_ORB = 10` (soul) y
  `SKIPPED_STEPS_ORB = 5` (nodes) exportadas, única fuente de la regla, el
  método y el reason.
- **Reason autocontenido**: `"pluto conjunct north node (separation {sep}° <= 10°)"`
  — la separación medida incluida; cero interpretación (ADR-0007).
- **Dedup de ensamblado**: `buildEvo` agrega `counts` una vez y alimenta también
  el input de `generateEvoAtoms` (interfaz pública intacta).
- **Sin archivos nuevos en `src/`**: `check:docs` (superficie + árbol) no cambia.

## Consecuencias

- `EVO_METHOD_DISCLOSURE` se elimina; el `method` (ahora en inglés, 296 chars,
  dentro del rango AXI de truncación) refleja cualquier cambio de orbe sin tocar
  texto.
- El `reason` del PPP incluye la separación medida; el branch `active: false` se
  cubre por fin con un test chart-level sobre mock ephemeris.
- Tests nuevos: `describeEvoCriteria` (agrupación/determinismo/live-derivation),
  separación en soul, y bloque evo sobre mock ephemeris.

## Alternativas

- Mantener la prosa pero única: deja la paridad en manos humanas; el repo ya
  eligió la paridad mecánica para docs↔código (`check:docs`) y el método debe
  heredarla.
- Serializar en commands importando las tablas: re-encoda la presentación de
  hechos de core en la capa de salida; rompe la locality (la cara pública vive
  con los datos).
- Nuevo módulo `/evo-criteria.ts`: un archivo para una función; `classical.ts`
  ya es el hogar natural de los hechos evo (átomos + disclosure).