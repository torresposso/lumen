---
id: T1-purity-adapters
title: Extraer adapters/geocode.ts y desacoplar core/birth.ts y core/types.ts
status: done
blockers: []
---

## Objetivo
Desacoplar `core/` de llamadas de red. `core/birth.ts` debe ser puro (sin I/O) y definir la interfaz de geocodificación. La implementación real de Open-Meteo debe vivir en `src/adapters/geocode.ts`.

## Tareas
1. Crear `src/core/types.ts` con tipos universales de nacimiento (`ResolvedBirth`, `BirthProvenance`).
2. Refactorizar `src/core/birth.ts` como módulo puro de fechas, zonas horarias y Julian Day.
3. Crear `src/adapters/geocode.ts` para aislar el I/O de Open-Meteo.
4. Actualizar tests correspondientes.
