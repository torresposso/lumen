---
id: T2-consultation-store
title: Crear storage/consultation-store.ts para expedientes clínicos
status: done
blockers: [T1-purity-adapters]
---

## Objetivo
Implementar la persistencia de expedientes clínicos en `~/.config/lumen/consultations.json` con permisos 0600, escritura atómica y soporte para sesiones abiertas/cerradas, hipótesis (`H1`, `H2`) y notas de consulta.

## Tareas
1. Definir tipos de sesión clínica e hipótesis en `src/core/types.ts`.
2. Crear `src/storage/consultation-store.ts` con operaciones idempotentes (`open`, `get`, `recordHypothesis`, `close`).
3. Crear tests unitarios en `tests/storage/consultation-store.test.ts`.
