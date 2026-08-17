---
id: 05-draconic-reject
type: task
status: resolved
blockers: [03-intake]
---

**¿Sirve a mi Nodo Norte?** Sí — mantener `draconic` como experimento puro y
evitar que el agente obtenga mecánica sobre una proyección que no la necesita.

## Objetivo

`chart draconic --evo` rechazado con error estructurado y accionable.

## Tareas

1. En `chartCommand`, si `mode === "draconic"` y `--evo` presente → `VALIDATION_ERROR`.
2. Mensaje + help: `Use lumen chart natal --evo` para mecánica evolutiva.
3. Test que `draconic --evo` nunca genera bloque `evo`.

## Criterios de aceptación

- `lumen chart draconic --evo` → `VALIDATION_ERROR` con hint.
- `lumen chart draconic` sin `--evo` sigue igual.

## Answer
- `chartCommand` rechaza `draconic --evo` con `VALIDATION_ERROR`.
