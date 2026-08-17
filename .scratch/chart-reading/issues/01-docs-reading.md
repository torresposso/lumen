---
id: 01-docs-reading
type: task
status: resolved
blockers: []
---

**¿Sirve a mi Nodo Norte?** Sí — un agente que aprende conmigo navega mejor un
ensamblado documentado en core que un engine varado en el command; el contrato
se fija antes de llegar el código (doc-first).

## Objetivo

Reescribir los docs vivos al target de la feature antes de tocar código.

## Tareas

1. `docs/adr/0012-reading-assembly-in-one-source.md`: ADR con la decisión
   (módulo `reading.ts`, función pura, help en la publicación, `T | undefined`,
   canon único, merge en core); supersede la cláusula de ADR-0011 que decía
   "the engine keeps `AstrologicalEngine`/`AstrologicalReading`/`BirthEcho`/the
   mean_node deletion" sin tocar los ADRs previos.
2. `DOMAIN.md` + `docs/agents/domain.md`: entrada `core/reading.ts` en el árbol
   (core 9 → 10 módulos).
3. `SPEC.md`: §2 actualiza el conteo de módulos de `core/` (9 → 10); §6.1 deja
   el conteo de tests listo para recalibrar en `04-tests`.
4. `CONTEXT.md`: el término **Astrological reading** gana su módulo
   (`src/core/reading.ts`, ADR-0012) y referencia cruzada con Chart projection
   y Evolutionary reading.

## Criterios de aceptación

- Los docs describen exactamente el contrato de `.scratch/chart-reading/spec.md`.
- El rojo de `check:docs` (reading.ts en el árbol sin archivo aún) es intencional
  durante la transición y vuelve a verde en `02-reading-module`.

## Answer

- ADR-0012 creada (ensamblado de la lectura natal en core; supersede la cláusula
  del engine de ADR-0011). DOMAIN.md + docs/agents/domain.md: entrada
  `core/reading.ts` en el árbol; SPEC §2 (9→10 módulos); CONTEXT.md: término
  **Astrological reading** con su módulo y cross-refs. `check:docs` rojo a
  propósito (reading.ts en el árbol sin archivo aún).