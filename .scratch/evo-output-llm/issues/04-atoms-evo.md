---
id: 04-atoms-evo
type: task
status: resolved
blockers: [01-docs-target]
---

**¿Sirve a mi Nodo Norte?** Sí — el surface factual que el agente usa para
interpretar (los átomos) hoy no cubre la mecánica evolutiva: con `--evo` el
agente tendría que re-parsear el YAML denso él mismo.

## Objetivo

Cubrir la mecánica evolutiva con átomos factuales, sin interpretación.

## Cambios

1. `src/core/classical.ts`: nueva `generateEvoAtoms(input: EvoAtomsInput): string[]`
   (función pura). Identificadores deterministas:
   - `pluto_aspects_N`, `pluto_stressful_aspects_N`, `pluto_nonstressful_aspects_N`
   - `ppp_sign_X`, `ppp_house_N`, `ppp_active` | `ppp_inactive`
   - `pluto_nn_separation_DD_FF` (2 dp, `_` en vez de `.`)
   - `pluto_nn_midpoint_SIGN_N`, `pluto_nn_antimidpoint_SIGN_N`
   - `sol_luna_phase_X` (espacios → `_`)
   - `north_node_ruler_X`, `south_node_ruler_X`, `north_node_aspects_N`,
     `south_node_aspects_N`, `nodal_motion_X`
   - `skipped_steps_N` + `skipped_BODY_ASPECT` por paso
   - `SOLAR|LUNAR_eclipse_TYPE_SIGN_N` por eclipse presente
2. `src/commands/chart.ts`: `buildEvo` construye el `EvoAtomsInput` y devuelve
   `{ evo, atoms }`; `compute()` fusiona `atoms` al final de
   `interpretationContext.atoms` cuando `--evo`.

## Criterios de aceptación

- Erik: los átomos del spec están presentes (p. ej. `ppp_active`,
  `pluto_nn_separation_73_44`, `skipped_chiron_square`).
- Sin `--evo`, `interpretationContext` queda idéntico (79 átomos para Erik).

## Answer
- `generateEvoAtoms` en `core/classical.ts` (pura, determinista); `buildEvo`
  devuelve `{ evo, atoms }` y `compute()` los fusiona a `interpretationContext`.
- Erik: 79 + 19 = 98 átomos; todos los del spec presentes (ppp_active,
  pluto_nn_separation_73_44, skipped_chiron_square, …).
- Sin `--evo` el bloque queda intacto (79 átomos, verificado).
