# Chart Evo Fixes: remediación del audit de congruencia

> **Estado**: Implementado y verificado — audit resuelto.
> **Origen**: `.scratch/chart-mechanics/audit.md`.
> **Datos de referencia**: Erik, 1981-01-26 00:51, Magangué (lat 9.24202, lon -74.75467, America/Bogota).

## Decisiones propuestas

1. **F1 — Fase de aspectos a Plutón**: corregir la condición invertida en
   `src/core/soul.ts::aspectPhase()`. Es un bug objetivo, no una decisión de doctrina.
2. **F2 — Midpoint Plutón–NN**: publicar **dos puntos**:
   - `midpoint` = midpoint cercano (media angular sobre el arco corto).
   - `antiMidpoint` = opuesto (arco largo).
3. **F3 — Orbes evolutivos**: no se cambian. Se documenta en help/CONTEXT/DOMAIN
   que `evo` usa `PLUTO_ASPECTS` y puede traer contactos ausentes de `chart.aspects`.
4. **F4 — Plutón y nodos**: incluir a Plutón en `nodeAspects` (norte y sur).
   Plutón **sigue excluido** de `skippedSteps` (doctrina).
5. **F5 — Bloque `evo` autocontenido**: agregar `lon` y `signDeg` a
   `evo.pluto`, `evo.ppp`, `evo.nodalAxis.north` y `evo.nodalAxis.south`.

## Contrato esperado tras los fixes (datos de Erik)

```text
evo:
  pluto:
    lon: 204.3457
    sign: Libra
    signDeg: 24.3457
    house: 12
    retrograde: false
    stressfulCount: 2
    nonstressfulCount: 3
    aspects:
      neptune  sextile       orb 0.4451 phase applying
      mercury  trine         orb 1.8696 phase applying
      mars     trine         orb 3.6080 phase applying
      venus    square        orb 5.6255 phase applying
      moon     conjunction   orb 9.2146 phase applying
  ppp:
    lon: 24.3457
    sign: Aries
    signDeg: 24.3457
    house: 6
    active: true
    aspects: [...]
  midpoint:      "Virgo 17°38' (H10)"     # near midpoint
  antiMidpoint:  "Pisces 17°38' (H4)"     # opposite midpoint
  nodalAxis:
    north:
      lon: 130.9058
      sign: Leo
      signDeg: 10.9058
      house: 9
      ruler: sun
      rulerPlacement: {...}
      aspects:
        [...]
        pluto quintile orb 1.4399 stress nonstressful   # nuevo (F4)
    south:
      lon: 310.9058
      sign: Aquarius
      signDeg: 10.9058
      house: 3
      ruler: uranus
      rulerPlacement: {...}
      aspects: [...]      # sin contacto Plutón–Sur en este chart
    motion: direct
    skippedSteps: [chiron square orb 2.5025]  # sigue sin plutón
  phase: Disseminating
  dispositorChains: {...}
  prenatalEclipses: {...}
```

## Orden de implementación (doc-first)

| # | Ticket | Cambio | Bloqueado por |
|---|---|---|---|
| 1 | `01-docs-fixes` | Actualizar SPEC/DOMAIN/CONTEXT/README y `.scratch/chart-mechanics/spec.md` al target: midpoint dual, Plutón en node aspects, `lon`/`signDeg`, nota de orbes evolutivos | Ninguno |
| 2 | `02-fix-pluto-phase` | Corregir `aspectPhase()` en `src/core/soul.ts` + tests unitarios | 01 |
| 3 | `03-midpoint-near-anti` | Calcular y publicar `midpoint` (cercano) + `antiMidpoint` en core y `buildEvo` | 01 |
| 4 | `04-pluto-in-node-aspects` | Incluir Plutón en `computeNodeAspects`; mantener exclusión en skipped steps | 01 |
| 5 | `05-evo-precision` | Agregar `lon`/`signDeg` a los puntos del bloque `evo` | 01 |
| 6 | `06-rerun-audit` | Re-ejecutar audit con los datos de Erik, recalibrar SPEC §6.1 y cerrar `chart-evo-fixes` | 02, 03, 04, 05 |

## Criterios de cierre

- `bun test`, `bun run typecheck` y `bun run check` verdes.
- Para Erik: las 5 fases de `evo.pluto.aspects` son `applying`.
- `evo.midpoint = Virgo 17°38' (H10)`, `evo.antiMidpoint = Pisces 17°38' (H4)`.
- `evo.nodalAxis.north.aspects` incluye `pluto quintile` orb 1.4399; `skippedSteps` no incluye Plutón.
- `evo.pluto/ppp/north/south` traen `lon` y `signDeg`.
- El audit queda `resolved` con el reporte actualizado.
