---
id: 01-docs-chart-projection
type: task
status: open
blockers: []
---

**¿Sirve a mi Nodo Norte?** Sí — un agente que aprende conmigo necesita un contrato
sin ambigüedad: que la carta, el bloque `evo` y `journey progressed` hablen la misma
precisión, documentado antes de que el código llegue (doc-first).

## Objetivo

Reescribir los docs vivos al target de la feature antes de tocar código.

## Tareas

1. `docs/adr/0011-chart-projection-in-one-source.md`: ADR con la decisión (módulo
   de proyección + política nombrada; retira la frase muerta "core queda crudo" de
   ADR-0008 sin tocarlo).
2. `DOMAIN.md` + `docs/agents/domain.md`: entrada `core/projection.ts` en el árbol
   y línea de precisión en §B.1 (`journey progressed` a 4dp).
3. `SPEC.md`: §2 actualiza el conteo de módulos de `core/` (8 → 9); §3 añade el
   párrafo de la política única de precisión; §6.1 deja el conteo de tests listo
   para recalibrar en `04-tests`.
4. `CONTEXT.md`: nuevo término **Chart projection** y referencia en `Evo block`.

## Criterios de aceptación

- Los docs describen exactamente el contrato de `.scratch/chart-projection/spec.md`.
- El rojo de `check:docs` (proyección en el árbol sin archivo aún) es intencional
  durante la transición y vuelve a verde en `02-projection-module`.

## Answer
<!-- pending -->