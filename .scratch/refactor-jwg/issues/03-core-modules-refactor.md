---
id: T3-core-modules-refactor
title: Reorganizar core/ en módulos profundos (soul, nodes, phases, journey, karma, classical)
status: done
blockers: [T1-purity-adapters]
---

## Objetivo
Reorganizar los 10 archivos planos actuales de `src/core/` en módulos profundos bien delimitados, garantizando la pureza del cálculo y calculando fases Sol-Luna progresadas y cadenas de regentes nodales completas.

## Tareas
1. `src/core/soul.ts`: Plutón, PPP, Midpoint y aspectos estresantes/fluidos.
2. `src/core/nodes.ts`: Nodos, regentes nodales, skipped steps y cadenas de dispositores de regentes nodales.
3. `src/core/phases.ts`: Fases Sol-Luna natales y secundarias progresadas (8 arquetipos).
4. `src/core/journey.ts`: Progresiones y estaciones planetarias (extrayendo lógica de comandos).
5. `src/core/karma.ts`: Sinastría evolutiva inter-cartas.
6. `src/core/classical.ts`: Proyección dracónica, lots herméticos y estrellas fijas.
7. Migrar tests unitarios de core correspondientes.
