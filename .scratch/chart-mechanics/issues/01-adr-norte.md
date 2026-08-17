---
id: 01-adr-norte
type: task
status: resolved
blockers: []
---

**¿Sirve a mi Nodo Norte?** Sí — integrar Plutón y el eje nodal en `chart natal`
hace que una sola llamada entregue la carta y la mecánica evolutiva, quitando la
ruta duplicada de `soul`; eso acerca la práctica al norte (leer mi propia carta
y aprender astrología evolutiva practicándola).

## Objetivo

Crear el ADR/ticket del norte que formalice:
- mover la mecánica evolutiva (Plutón/PPP + eje nodal) a `chart natal --evo`;
- retirar `soul` de la superficie (5 comandos);
- eliminar `--full`;
- `chart draconic` rechaza `--evo`.

## Tareas

1. Redactar ADR (siguiente número libre, p. ej. ADR-0007) en `docs/adr/`.
2. Responder en la primera línea la pregunta del norte.
3. Actualizar el subtítulo de la superficie según SPEC post-decisión.

## Criterios de aceptación

- ADR registrado con la decisión y su justificación.
- El ADR bloquea a los tickets de implementación de esta feature.

## Answer
- Creado `docs/adr/0007-chart-evo.md` con la decisión y justificación del norte.
