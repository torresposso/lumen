# Issue 01: Engine vs. LLM Responsibility Boundary

## Context

Lumen v2 is a deterministic astrological engine designed according to AXI principles. When introducing interpretation capabilities (`--interpret` flags and `lumen chart synthesis`), we need a clear boundary between what Lumen computes and what external LLMs/Agents generate.

## Decision

Lumen outputs **pure semantic TOON/JSON structures** grouped by evolutionary meaning (e.g. `karmicRoot`, `evolutionaryAxis`, `skippedStepTensions`, `cycleSeason`, `activeTriggers`, `consciousChoices`) rather than pre-rendered natural language text or rigid prose templates.

### Key Tenets:
1. **Zero Hallucination Grounding**: Lumen computes the exact vectors, rulership chains, canonical resolution targets (`resolutionNode`), and evolutionary themes deterministically.
2. **Agent / LLM Autonomy**: The LLM consumes these structured thematic blocks and handles tone, pacing, vocabulary, and personalization for the end user.
3. **No English/Spanish Hardcoded Prose**: Lumen stays language-neutral in its semantic output; interpretation prose is crafted dynamically by the consuming agent in whatever human language is requested.
