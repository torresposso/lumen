---
Type: task
Status: resolved
Blocked by: 01
---

# 02-core-charts

¿Sirve a mi Nodo Norte? Sí: el seam compartido reduce fricción para futuras
mejoras en journey/karma.

## Actividad

- Crear `src/core/charts.ts` con `chartAt(request, jdUt, ephemeris)`.
- Refactorizar `computeReading` para usar `chartAt`.
- Añadir `tests/core/charts.test.ts` con fake `Ephemeris`.
