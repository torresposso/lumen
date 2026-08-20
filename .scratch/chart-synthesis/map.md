# Chart synthesis & Evolutionary Framework — Map

Effort: Define and implement the JWGEA Evolutionary Synthesis Framework across Lumen v2 (command-level `--interpret` flags and dedicated `lumen chart synthesis` orchestrator). This effort **decides and executes**.

## Destination

Lumen v2 delivers a deterministic, non-hallucinatory interpretive synthesis layer for agents and humans based on the 3-Layer Soul Stack (JWGEA canon):
1. Per-module interpretation payloads via `--interpret` flag on `chart natal`, `chart transits`, and `chart progressions`.
2. A unified composite command `lumen chart synthesis <uuid> --when "<iso>" [--where "<lat, lon, place>"]` that computes and weaves the 3 layers (Karmic Root + Internal Soul Clock + Present Cosmic Triggers) plus a 4th automated Cross-Synthesis / Evolutionary Dynamics section into an aggregated TOON structure.
3. Strict adherence to AXI, Doc-First (`spec.md`), and TDD with clean domain boundaries (engine computes deterministic thematic structures and synthesis vectors; agents/LLMs generate prose).

## Notes

- Canon: Jeffrey Wolf Green Evolutionary Astrology (JWGEA). Strict orbs, Porphyry houses, True Node, Skipped Steps with canonical `resolutionNode`, Pluto Polarity Point (PPP), and 28-year Progressed Sol-Luna Phase cycle.
- AXI Principles: Determinism, ISO-8601 with explicit offset (`--when`), optional `--where` for transit local angles.
- Language: English for all code, domain terms, tests, and documentation.
- Doc-First Rule: `map.md` closes frontier decisions → `spec.md` formalizes contracts → tickets → TDD implementation.

## Frontier (Closed)

*(All 4 frontier decisions resolved into issues 01, 02, and 03)*

## Execution Tickets

1. [Issue 04: Atomic Interpret Flags](issues/04-atomic-interpret-flags.md) (`natal`, `transits`, `progressions`)
2. [Issue 05: Synthesis Engine and Cross-Layer Dynamics](issues/05-synthesis-engine-and-cross-dynamics.md)
3. [Issue 06: CLI Integration and E2E Tests](issues/06-cli-integration-and-e2e.md)

## Decisions so far

<!-- the index — one line per closed ticket -->

- [engine-vs-llm-boundary](issues/01-engine-vs-llm-boundary.md) — Lumen outputs pure semantic TOON/JSON structures grouped by evolutionary themes (karmic root, soul clock, active triggers, integration vectors) rather than pre-rendered prose; agents/LLMs generate natural language reading dynamically.
- [cli-surface-and-flags](issues/02-cli-surface-and-flags.md) — `--interpret` transforms atomic commands (`natal`, `transits`, `progressions`) into specialized semantic interpretation blocks (`natalInterpretation`, `transitsInterpretation`, `progressionsInterpretation`), while `lumen chart synthesis <uuid> --when ...` publishes the composite 3-layer + integration vectors block (`synthesis`).
- [synthesis-payload-and-thematic-grouping](issues/03-synthesis-payload-and-thematic-grouping.md) — Defines exact 4-section synthesis structure: Layer 1 `karmicRoot`, Layer 2 `soulClock`, Layer 3 `cosmicTriggers`, and Layer 4 `evolutionaryDynamics` (skipped step activations with resolution nodes and Pluto/Node pressure).

## Out of scope

- Generating raw conversational chatbot prose inside Lumen.
- Non-JWGEA traditions (predictive Hellenistic, modern psychological flat listings).
- External API calls or geocoding inside the engine.
