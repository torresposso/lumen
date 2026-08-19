# 02 — single-block chart output structure

Type: prototype
Status: resolved

## Question

What exactly does the one-block `chart` TOON output look like?

The charting session settled the direction: ONE `chart` object — measurements first, then flat canon-derived facts by relevance; no evo / interpretationContext blocks; duplicated atoms dead; unique atoms (patterns/signature/house rulers) structured. This ticket raises the fidelity: build the concrete skeleton to react to.

The prototype must pin down:

- **Exact key names and nesting**: birth echo (v2 profile fields), bodies, angles, cusps, aspects; then the flat canon keys (pluto, ppp, midpoint, antiMidpoint, nodalAxis, phase, dispositorChains, prenatalEclipses, patterns, signature); disclosures (method, counts); where summary/help live (inside chart vs shared siblings).
- **Ordering by relevance** — the JWGEA reading order within the canon facts.
- **Precision conventions**: degree formatting/rounding, house/sign display, TOON scalar rules.
- **Concrete sample**: TOON output for the Tampa anchor (1990-06-10 14:30 America/New_York → profile jdUt/lat/lon) with Porphyry houses — generated against v1 code or hand-computed, enough to react to the shape.

Close this ticket when the user has reacted to the skeleton and the block shape is unambiguous.

## Context

- Charting decisions: one block; Porphyry houses; true node only; UUID input.
- v1 code: `src/core/{reading,types,classical,evolutionary-reading}.ts` at git `297b08e` (shape to adapt); v1 spec at git `a7b904b` (`.scratch/chart-evo-siempre/spec.md`).
- v2 profile fields (current `main`): `id`, `name?`, `city`, `birth { local, offsetMinutes, lat, lon, jdUt }`.

## Answer

Resolved 2026-08-18 with the user reacting to the prototype.

**Prototype asset:** `.scratch/chart-natal/prototypes/02-output-structure.md` — TOON real (encoded with `@toon-format/toon`, the AXI encoder lumen already uses) generated against the v1 code running with Porphyry houses, Tampa anchor (1990-06-10 14:30 America/New_York). **The sample in §5 (without `summary`) IS the target shape.**

**Output shape:** a single `chart` block — measurements first (birth echo = the stored v2 `ToonProfile` shape exactly, then `houseSystem: "porphyry"` + `zodiac: "tropical"` scalars, then bodies/angles/cusps/aspects/declinationAspects), then the flat canon facts in JWGEA reading order (pluto → ppp → midpoint → antiMidpoint → nodalAxis → phase → dispositorChains → prenatalEclipses → patterns → signature → houseRulers → counts → method). No `evo`/`interpretationContext` blocks, no atoms, **no `summary`** (user decision) — `chart` is the only published block (+ framework `help` on errors).

**D1–D9 verdicts:** summary **eliminated**; frame as `chart` scalars + extended `method`; birth echo = stored-profile keys; bodies = full v1 set (lon/sign/signDeg/house/retrograde/speed/lat/dist/ra/dec/dignities); midpoint/antiMidpoint **structured** `{lon, sign, signDeg, house}`; pluto count names kept v1 (`stressfulCount`/`nonstressfulCount`); patterns **omit absent qualifier keys**; `houseRulers` **published** (12 rows derived from cusps + SIGN_RULERS); method extends v1 text with the frame. Precision: lon/signDeg/lat/dist/ra/dec/tMax 4 · speed 6 · orb 4 · strength 3 · separation 2 · jdUt 6, coords 4 (v2 policy).
