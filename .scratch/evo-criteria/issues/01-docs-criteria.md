---
id: 01-docs-criteria
type: task
status: resolved
blockers: []
---

**¿Sirve a mi Nodo Norte?** Sí — documentar primero el target (criterios
concentrados en core, disclosure derivado) evita que el agente aprenda un
contrato donde el mismo número vive en 4 sitios y puede driftar: la conversación
de aprendizaje necesita hechos con una sola fuente.

## Objetivo

Actualizar docs vivos al target del deepening antes de tocar código.

## Tareas

1. `docs/adr/0009-evo-criteria.md`: ADR con D1–D8.
2. `CONTEXT.md`: nuevo término `Evolutionary criteria`; actualizar `Evo block`
   (method derivado de las tablas de core, separation medida por core) y
   `Pluto Polarity Point` (separación = la medida de la regla, sin fallback;
   reason con la separación medida).
3. `DOMAIN.md` + `docs/agents/domain.md`: `method` al string derivado (D5);
   borde `ppp.separation` (presente con el Nodo Verdadero — la referencia de la
   regla; medida de core, sin fallback).
4. `SPEC.md`: §3 párrafo evo (method derivado de las tablas, no re-encodado);
   §4.9 (disclosure derivado de core). §6.1 se recalibra al cierre en
   `04-buildEvo-dedup` (el conteo de tests sube).
5. README: solo si un ejemplo cambia de forma (no debería).

## Answer
- ADR-0009 creada (D1–D8); CONTEXT.md con el término `Evolutionary criteria`
  nuevo y `Evo block`/`Pluto Polarity Point` al target (method derivado,
  separación medida por core sin fallback, reason con separación).
- DOMAIN.md y docs/agents/domain.md: `method` = string derivado D5 y borde
  `ppp.separation` (referencia = Nodo Verdadero, sin fallback).
- SPEC.md §3/§4.9: method derivado de las tablas de core, nunca a mano.
- README sin cambio (no contiene el ejemplo evo). check:docs verde.