# 3. Advanced Evolutionary Astrology Calculations

* Status: accepted
* Deciders: User, Antigravity Agent
* Date: 2026-08-13

## Context and Problem Statement

`lumen` provides basic evolutionary calculations (Pluto, Pluto Polarity Point, North/South Node axis, Skipped Steps, Midpoint, Dispositor chains). To deliver deeper JWGEA (Jeffrey Wolf Green Evolutionary Astrology) insights, the engine needs to evaluate aspects to the Pluto Polarity Point (PPP), track Node Motion Status (stationary/direct/retrograde), and compute Sol-Luna phase mechanics.

## Decision Drivers

* High astronomical accuracy and alignment with canonical JWGEA literature.
* Strict locality within `src/core/evolutionary.ts` without polluting generic natal chart aspects.
* Maintain small, deep interfaces that preserve 100% testability.

## Considered Options

1. **Option A**: Encapsulate PPP aspects, Node Motion Status, and Sol-Luna Phase Mechanics inside `EvolutionaryResult` in `src/core/evolutionary.ts`.
2. **Option B**: Mix PPP aspects into the general `chart.aspects` array.

## Decision Outcome

Chosen Option: **Option A**, because keeping evolutionary calculations encapsulated within `EvolutionaryResult` maintains clear domain locality and avoids cluttering general chart aspect arrays.

### Positive Consequences

* Callers and tests gain rich evolutionary insights directly on `reading.chart.evolutionary`.
* Zero side effects on existing natal chart aspect calculations.
* `CONTEXT.md` terms stay synchronized with TypeScript interface definitions.

### Negative Consequences

* Minor increase in computation surface in `evolutionary.ts`.
