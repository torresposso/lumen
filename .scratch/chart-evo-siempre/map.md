# Chart evo siempre — mapa

Superficie de `chart` entrega la mecánica: natal siempre, draconic en el
canon (ADR-0014). Decidido por grill del capitán (2026-08-17).

## Decisiones-so-far

- Natal siempre publica `evo`; `--evo` se elimina de raíz (sin `--no-evo`).
- Draconic entra al canon; su `evo` se recalcula sobre el zodíaco draconic
  (NN = 0 por construcción; el marco fijo del eje y sus regentes se declaran
  en `method`).
- `computeReading(request, ephemeris): AstrologicalReading` — no-opcional, sin
  rama de error (la natal siempre lleva Plutón y Nodo Verdadero).
- `interpretationContext` siempre incluye átomos evolutivos, en el marco de
  cada zodíaco.
- Un solo ADR (0014) + cadena doc-first; ADR-0007 queda histórico.
- Candidato de revisión «describirEvoCriteria junto a sus tablas»: ticket
  aparte, después de esta cadena.

## Decisiones-so-far, actualización

- ✅ `01-docs-chart-evo-siempre` resuelto (2026-08-17): docs vivos al target
  (`DOMAIN.md`, `SPEC.md §3/§6.1`, `CONTEXT.md`, `README.md`,
  `docs/agents/domain.md`); `grep -- --evo` limpio y `bun run check` verde.
  Nota: `check:docs` no se pone rojo en esta transición (la paridad mecánica —
  comandos de §3 y árbol src/ — no cambia con gramática); el verde de cierre se
  verifica igual en 05.

## Hijos

- [x] `01-docs-chart-evo-siempre` — docs vivos al target (DOMAIN, SPEC §3/§6.1,
      CONTEXT, README, docs/agents/domain.md). Sin blockers. — **resolved**
- [x] `02-core-reading-no-opcional` — `Blocked by: 01` — **resolved**:
      `computeReading(request, ephemeris)` no-opcional, invariante pluto+true
      node con assert en `chartAt`, evo total. Suite verde (188/668).
- [x] `03-command-chart-sin-flag` — `Blocked by: 01` — **resolved**:
      `--evo` fuera de raíz (parseEvoFlag, rechazo draconic, usages, help de
      home/profile, flag spec de intake); tests de flags rechazados. Verde.
- [x] `04-draconic-evo` — `Blocked by: 01` — **resolved**: el bloque evo
      draconic recalcula sobre el zodíaco draconic (eje fijo por construcción,
      eclipses proyectados por la resta del Nodo, `method` con el marco);
      suite nueva draconic-evo. Verde.
- [x] `05-cierre` — `Blocked by: 02, 03, 04` — **resolved**: check verde
      (biome + check:docs), SPEC §6.1 recalibrado (193 tests / 695 expect),
      smoke natal+draconic con el contrato de `spec.md`, gramática viva sin
      `--evo` (solo registro histórico ADR-0007/0008/0014).

> **Cadena `chart-evo-siempre` cerrada completa (2026-08-17).** La superficie
> de `chart` entrega la mecánica siempre (natal + draconic en el canon), el
> `--evo` desapareció de raíz y la paridad docs ↔ código quedó verde.
- [ ] `03-command-chart-sin-flag` — `Blocked by: 01`.
- [ ] `04-draconic-evo` — `Blocked by: 01`.
- [ ] `05-cierre` — `Blocked by: 02, 03, 04`; check:docs verde + SPEC §6.1 final.
