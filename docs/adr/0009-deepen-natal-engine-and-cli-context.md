# ADR-0009 — Deepen Natal Chart Engine and Unify Ephemeris on CLI Context

Following the implementation of `lumen chart natal` (ADR-0008), the astrological subsystem spanned 7 shallow modules with 20+ fine-grained exports, intermediate data plumbing, and scattered aspect loops. Concurrently, `Ephemeris` was not surfaced on `CliContext`, forcing commands to instantiate heavy Caelus engines and preventing fast in-memory test substitution.

We decided:

1. **Unify `CliContext` in `src/core/context.ts`**: `CliContext` carries symmetric capability ports (`profiles: ProfileStore` and `ephemeris: Ephemeris`), injected at the composition root (`buildCliOptions`).
2. **Consolidate Natal Engine into 2 Deep Modules**:
   - `src/core/astrology/aspects.ts`: Single parametric aspect calculation engine, orbs, phases, and strength calculus.
   - `src/core/astrology/natal.ts`: Astronomical projections and JWGEA evolutionary synthesis (Pluto, PPP, nodes, skipped steps, eclipses, patterns, signature).
   - `src/core/chart.ts`: Single external pure entry point `computeNatalChart(profile, ephemeris)`.
   - Delete 6 shallow micro-modules (`geometry.ts`, `positions.ts`, `soul.ts`, `nodes.ts`, `eclipses.ts`, `patterns.ts`).
3. **Self-Describing Subcommands**: Subcommands declare their summary metadata directly; command groups expose arm catalogs dynamically to the composition root.

## Update (2026-08-19, architecture review)

The `CliContext` seam it decided on has since become part of the composition
root: `CliContext` and `requireCliContext` (now `CONTEXT_ERROR`) live in
`src/cli.ts` — the one-module `src/cli/context.ts` grew no depth, so the seam
collapsed back into the wiring. The ports on the context are unchanged.
