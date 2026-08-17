---
id: 02-docs-evo
type: task
status: resolved
blockers: [01-adr-norte]
---

**¿Sirve a mi Nodo Norte?** Sí — los docs al target evitan que el agente tropiece
con `soul` o `--full` y le enseñan el camino correcto (`chart natal --evo`).

## Objetivo

Actualizar todos los docs afectados al target, antes de tocar código (doc-first).

## Tareas

1. `SPEC.md` §3: superficie de **5 comandos** (`journey`, `karma`, `profile`, `chart`, `setup`); retirar `soul` y `--full`.
2. `DOMAIN.md` y `docs/agents/domain.md`: quitar `src/commands/soul.ts` del árbol; mover la sección `lumen soul` a `lumen chart natal --evo` con el bloque `evo`.
3. `CONTEXT.md`: redefinir “Evolutionary reading” como `chart natal --evo`; añadir `evo` al glosario.
4. `README.md`: reemplazar ejemplos `lumen soul ...` por `lumen chart natal ... --evo`.
5. `src/cli.ts` documentado: Home y `topLevelHelp` sin `soul`.
6. `src/commands/profile.ts` help: `lumen soul` → `lumen chart natal ... --evo`.
7. Referenciar en docs que el módulo real de mecánica es `core/soul` + `core/nodes` + `core/phases` (ADR-0003 histórico queda como registro).

## Criterios de aceptación

- `bun run check:docs` apunta al target (puede quedar rojo a propósito durante la transición).
- Ninguna doc vivo menciona `soul` ni `--full`.

## Answer
- SPEC §3 → 5 comandos; DOMAIN/docs/agents/domain → `chart natal --evo`; CONTEXT → Evo block; README → `--evo`; Home/help pendiente de ticket 06 (código).
