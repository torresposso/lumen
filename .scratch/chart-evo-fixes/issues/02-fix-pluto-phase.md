---
id: 02-fix-pluto-phase
type: task
status: resolved
blockers: [01-docs-fixes]
---

**¿Sirve a mi Nodo Norte?** Sí — el agente no puede recibir `applying` en la
carta y `separating` en `evo` para el mismo aspecto.

## Objetivo

Corregir `aspectPhase()` en `src/core/soul.ts`.

## Cambio exacto

```ts
// actual (invertido)
if ((relativeSpeed > 0 && delta < 0) || (relativeSpeed < 0 && delta > 0)) {
  return "applying";
}

// target
if ((relativeSpeed > 0 && delta > 0) || (relativeSpeed < 0 && delta < 0)) {
  return "applying";
}
```

## Tareas

1. Corregir la condición.
2. Agregar tests unitarios a `tests/core/soul.test.ts`:
   - cuerpo más rápido acercándose → `applying`.
   - cuerpo más rápido alejándose → `separating`.
   - cuerpo y Plutón con igual velocidad → `exact`.
3. Agregar assert en `tests/commands/chart.test.ts`: para la carta de prueba,
   las fases de `evo.pluto.aspects` deben coincidir con las de `chart.aspects`
   en los pares compartidos.

## Criterios de aceptación

- Para Erik: `neptune`, `mercury`, `mars`, `venus` y `moon` → `applying`.
- Tests verdes.

## Answer
- Condición corregida; tests unitarios + integración verdes.
