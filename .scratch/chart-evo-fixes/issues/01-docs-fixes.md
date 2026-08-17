---
id: 01-docs-fixes
type: task
status: resolved
blockers: []
---

**¿Sirve a mi Nodo Norte?** Sí — documentar primero el target evita que el
agente aprenda un contrato ambiguo (`midpoint` lejano, Plutón ausente de los
nodos, grados omitidos) que contradice la carta.

## Objetivo

Actualizar docs vivos al target de los fixes antes de tocar código.

## Tareas

1. `.scratch/chart-mechanics/spec.md`: actualizar contrato `evo` con
   `midpoint`/`antiMidpoint`, `lon`/`signDeg`, Plutón en `nodeAspects` y nota de orbes.
2. `SPEC.md` §3 (si procede): reflejar que `evo` es autocontenido y usa orbes evolutivos.
3. `DOMAIN.md` + `docs/agents/domain.md`: actualizar ejemplo y bordes.
4. `CONTEXT.md`: definir `midpoint` cercano/`antiMidpoint` y aclarar que
   `skippedSteps` excluye a Plutón, pero `nodeAspects` lo incluye.
5. `README.md`: si el ejemplo cambia, actualizar.
6. `src/commands/chart.ts`/`intake.ts` usage: solo en tickets de código (el texto
   final debe coincidir con el target).

## Criterios de aceptación

- `bun run check:docs` queda rojo a propósito durante la transición y verde al final.
- Los docs describen exactamente el contrato de `.scratch/chart-evo-fixes/spec.md`.

## Answer
- Actualizados `.scratch/chart-mechanics/spec.md`, DOMAIN, docs/agents/domain, CONTEXT al target.
