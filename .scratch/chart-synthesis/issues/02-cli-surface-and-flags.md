# Issue 02: CLI Surface and Flag Design

## Context

We need a consistent, predictable AXI surface for individual command interpretations (`--interpret`) and the composite synthesis command (`lumen chart synthesis`).

## Decision

1. **Atomic Commands with `--interpret`**:
   When `--interpret` is passed to atomic commands, it transforms the output into a specialized semantic interpretation block:
   - `lumen chart natal <uuid> --interpret` → `{ natalInterpretation: { ... } }`
   - `lumen chart transits <uuid> --when "<iso>" [--where "<lat, lon, place>"] --interpret` → `{ transitsInterpretation: { ... } }`
   - `lumen chart progressions <uuid> --when "<iso>" --interpret` → `{ progressionsInterpretation: { ... } }`
   Without `--interpret`, they retain their exact raw astronomical/geometric outputs.

2. **Composite Synthesis Command**:
   - `lumen chart synthesis <uuid> --when "<iso>" [--where "<lat, lon, place>"]`
   Always publishes the unified 3-layer synthesis structure `{ synthesis: { ... } }` combining the karmic root, internal soul clock, and active cosmic triggers into explicit integration choices.
