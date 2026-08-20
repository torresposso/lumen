# 04 — Transits evolutionary triggers (JWGEA)

Type: implementation
Status: resolved
Blocked-by: 03-transits-aspects-and-house-projections
Blocks: 05-cli-integration-and-e2e


## Goal

Calculate the specific evolutionary mechanics triggers when transits contact natal karmic structures.

## Requirements

1. Create `src/engine/transits/triggers.ts`.
2. Extract and filter contacts to:
   - **Pluto & PPP**: Aspects to natal Pluto and the natal Pluto Polarity Point (if active).
   - **Nodal Axis**: Aspects to natal True North Node and South Node.
   - **Skipped Steps**: Detect transits squaring or aspecting natal skipped step bodies, associating the `resolutionNode` ("north" | "south").
   - **Dispositor Activations**: Detect transits to final dispositors and mutual reception bodies.
3. Expose pure function `computeEvolutionaryTriggers(transitAspects, natalFactSummary)` returning `evolutionaryTriggers`.

## Verification

- Unit tests on charts with known Skipped Steps and Final Dispositors verifying trigger detection.
