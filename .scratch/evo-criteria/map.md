# Evo criteria: deepening A — mapa

Deepening A del reporte de arquitectura: concentrar el ensamblado del bloque
`evo` para que core sea dueño de las decisiones (separación, disclosure derivado,
constantes) y commands publique sin re-encodar.

## Decisiones-so-far

- D1: `method` derivado de las tablas; adiós a la prosa `EVO_METHOD_DISCLOSURE`.
- D2: separación expuesta desde `computeSoulReading` (cruda); se elimina el
  fallback `true_node ?? north` del fix de code-review.
- D3: `PPP_DEACTIVATION_ORB = 10` (soul.ts) y `SKIPPED_STEPS_ORB = 5` (nodes.ts)
  exportadas, única fuente (regla + razón + método).
- D4: alcance = reglas + dedup counts→atoms en `buildEvo`; interfaz de
  `generateEvoAtoms` intacta.
- D5: `method` agrupado por orbe descendente, en inglés, derivado mecánicamente.
- D6: `describeEvoCriteria(): string` pura en `core/classical.ts` (junto a los
  átomos evo), imports de soul/nodes sin ciclos.
- D7: `reason` = `"pluto conjunct north node (separation {sep}° <= 10°)"`.
- D8: tests chart-level con mock ephemeris para `ppp.active: false`.
- `EvoOutput.ppp.separation` pasa a `?: number` (edge teórico sin Nodo Verdadero).
- Doc-first: `01-docs-criteria` bloquea a los tickets de código.

## Hijos

- [x] `01-docs-criteria`
- [x] `02-core-separation`
- [x] `03-disclosure`
- [x] `04-buildEvo-dedup`