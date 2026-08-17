---
id: 01-docs-target
type: task
status: resolved
blockers: []
---

**¿Sirve a mi Nodo Norte?** Sí — documentar primero el target evita que el agente
aprenda un contrato ambiguo (números crudos, átomos incompletos, criterios
indocumentados) que enturbie la interpretación de mi carta y la de mi familia.

## Objetivo

Actualizar docs vivos al target de la feature antes de tocar código.

## Tareas

1. `docs/adr/0008-evo-output-llm.md`: nueva ADR con las decisiones S1/S4/S5/S6/S7/S8
   y la navegación plana del bloque `evo`.
2. `SPEC.md`: §3 (párrafo evo: counts/method/átomos), §4.9 (disclosure in-block),
   y deja §6.1 listo para recalibrar en `06-tests`.
3. `DOMAIN.md` + `docs/agents/domain.md`: contrato `evo` al target (ejemplo real
   de Erik, `counts`, `method`, `ppp.separation/reason`, redondeo 4 dp, átomos evo).
4. `CONTEXT.md`: definir `Interpretation context` (átomos para LLM) y
   `Chart signature` (10 planetas); actualizar `Evo block` y `Pluto Polarity Point`.
5. `README.md`: solo si un ejemplo cambia de forma.

## Criterios de aceptación

- Los docs describen exactamente el contrato de `.scratch/evo-output-llm/spec.md`.
- `bun run check:docs` sigue en verde (la superficie y el árbol no cambian).

## Answer
- ADR-0008 creada; SPEC §3/§4.9, DOMAIN.md y docs/agents/domain.md al target;
  CONTEXT.md con `Interpretation context` y `Chart signature` nuevos y
  `Evo block`/`Pluto Polarity Point` actualizados. README no cambia de forma
  (ejemplo intacto). check:docs sigue en verde (superficie y árbol intactos).
