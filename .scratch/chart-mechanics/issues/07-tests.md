---
id: 07-tests
type: task
status: resolved
blockers: [06-delete-soul]
---

**¿Sirve a mi Nodo Norte?** Sí — los tests aseguran que el agente recibe el
contrato exacto: default intacto, `--evo` completo, errores claros.

## Objetivo

Cobertura de tests para el contrato `--evo` y los bordes.

## Casos

1. `chart natal` sin flags → output idéntico al actual (sin `evo`, sin `phase` en base).
2. `chart natal <profile> --evo` → bloque `evo` completo.
3. `chart natal --when ... --place ... --evo` → bloque `evo`.
4. `chart draconic --evo` → `VALIDATION_ERROR`.
5. `pppActive=false` cuando Plutón conj. Nodo Norte.
6. `skippedSteps: []` cuando no hay pasos omitidos.
7. `--bodies` sin `pluto`/`true_node` → `CALCULATION_ERROR`.
8. Sol o Luna ausentes → fase no falsa.
9. `--evo=false` → output base.
10. `usage ↔ flagSpec` incluye `--evo`.

## Criterios de aceptación

- Todos los casos verdes en `bun test`.
- Se recalibra SPEC §6.1 con el conteo real.

## Answer
- Tests en `chart.test.ts` y `profile.test.ts`; `bun test` verde (159/493).
