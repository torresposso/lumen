# Chart natal — Map

Effort: reimplement lumen v1's final `chart natal` (chart + evo + atoms) on the current lumen v2 codebase, by porting and adapting the v1 code. This effort **decides and executes**.

## Destination

`lumen chart natal <uuid>` reads a v2 birth profile by UUID and publishes a single TOON `chart` block: measurements (v2 birth echo, bodies, angles, cusps, aspects) followed by flat canon-derived facts ordered by relevance (pluto → ppp → midpoint/antiMidpoint → nodalAxis → phase → dispositorChains → prenatalEclipses → patterns → signature) plus disclosures (method, counts), with shared summary/help. No evo / interpretationContext blocks, no flat atoms — duplicated atoms die, unique facts (patterns/signature/house rulers) become structured keys. Porphyry houses (JWGEA canon — not v1's Placidus), true node only, caelus reintroduced. Once the decisions close, `spec.md` lands (doc-first, `bun run check:docs` parity) and the implementation ships on v2.

## Notes

- Domain: natal chart = measurements (engine positions) + canon-derived evolutionary facts (JWGEA). Terms re-enter `CONTEXT.md` as they crystallise — domain-modeling in every session.
- Stack: Bun + TypeScript + axi-sdk-js + caelus (version pinned in 03). No caelus-birth / geocoder / config store / zod.
- Input: v2 profiles only (`lumen chart natal <uuid>`) — no inline `--when`/`--where`.
- Skills per session: grilling + domain-modeling (default); research for 01; prototype for 02 and 05.
- Execution: this effort decides AND executes — when the frontier closes, `.scratch/chart-natal/spec.md` is written (doc-first) and the implementation lands on v2 in the same effort.
- Charting decisions (closed, do not reopen): destination = port v1's final `chart natal` (git `297b08e`) to v2; input UUID-only; output = ONE `chart` block ordered by relevance (no evo/atoms differentiation — duplicated atoms removed, unique facts structured); houses = Porphyry (fixed, no flag, no polar fallback); true node only; caelus reintroduced; effort executes.

## Decisions so far

<!-- the index — one line per closed ticket: enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [caelus-delta-research](issues/01-caelus-delta-research.md) — `porphyry` houses available at every latitude and the chart API unchanged on both 0.23.0 and 0.24.1; breaking changes 0.23.0→0.24.1 are additive-only (`Chart.warnings`, `Position.latSpeed`, `ChartOptions.separation/aspects`); **`0.24.0` deprecated on npm, never pin it** (`^0.23.0` resolves to 0.24.1); the port runs on both → ticket 03 decides on reproducibility/maintenance grounds.
- [caelus-version-pin](issues/03-caelus-version-pin.md) — Pin exact version `0.24.1` (`"caelus": "0.24.1"` in `package.json`) to guarantee 100% deterministic chart calculations for verification vectors while benefiting from latest Pluto/Chiron ephemeris precision fixes and avoiding broken 0.24.0 tarball.
- [single-block chart output structure](issues/02-output-structure-prototype.md) — ONE `chart` block is the whole output (no evo/atoms/summary): measurements first (birth echo = stored `ToonProfile` keys, `houseSystem`/`zodiac` scalars, bodies full v1 set, angles, cusps, aspects, declinationAspects), then flat canon facts in JWGEA order (pluto → ppp → midpoint → antiMidpoint → nodalAxis → phase → dispositorChains → prenatalEclipses → patterns → signature → houseRulers → counts → method). Midpoint/antiMidpoint structured, patterns omit absent keys, houseRulers published, pluto counts keep v1 names. Real TOON sample (Porphyry, Tampa anchor) IS the target shape — asset [`prototypes/02-output-structure.md`](prototypes/02-output-structure.md).
- [port-module-layout](issues/04-port-module-layout.md) — Deep module architecture: `src/adapters/ephemeris.ts` (Ephemeris seam wrapping Caelus), `src/core/chart.ts` (deep entry point `computeNatalChart`), `src/core/astrology/*` (pure calculation submodules: positions, soul, nodes, phases, dispositors, eclipses, patterns), `src/core/toon.ts` (deterministic TOON formatter), and `src/commands/chart.ts` (`createSubcommandGroup`). Projections and atom string arrays die.
- [chart-natal-command-surface](issues/05-command-surface.md) — CLI surface: `lumen chart natal <uuid>` (positional UUID only, no inline flags). Strict AXI error semantics (NOT_FOUND with hint, VALIDATION_ERROR on bad args), root TOON block `{ chart }`.
- [verification-vectors-with-porphyry](issues/06-verification-vectors.md) — Multi-tier verification: Tampa Anchor golden vector test, edge cases (high latitudes, PPP deactivation), pure domain unit tests under Porphyry, and CLI integration suite.

## Not yet specified

- Execution slices (spec.md + implementation) — graduates once the decisions close.

## Out of scope

- Other chart commands and traditions: draconic, journey, karma, soul, setup, intake.
- Config store / chart options / caelus-birth / geocoding / inline `--when`/`--where` / `--house-system` flag.
- Interpretive astrology: lumen publishes facts, never a reading — "reading" rejected as name and concept.
