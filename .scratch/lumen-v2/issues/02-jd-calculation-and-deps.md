# 02 — Julian Day calculation and dependency tree

Type: research
Status: resolved
Blocked by: 01

## Question

How does lumen compute the jdUt from local time + offset without caelus-birth?

- Standard formula in pure arithmetic (e.g. Fliegel–Van Flandern / Meeus) — verify accuracy over common date ranges (1900–2100) and edge cases (proleptic Gregorian, fractional hours).
- Contract validations from 01: date range, offset ±840 minutes.
- Final dependency tree: axi-sdk-js (yes), zod (is it used to validate the input contract?), caelus / caelus-birth (do they leave package.json?), luxon (not a direct dep — confirm).

**Charting note:** the fact-finding can run in parallel with 01 (it does not depend on its answer); the final dependency decision (zod) does depend on 01’s contract, so this ticket resolves after 01.

## Comments

- **2026-08-18 — research completed** (sub-agent; branch `research/calculo-jd-y-deps`, findings in `research/calculo-jd-y-deps.md`, unmerged). Facts: Meeus ch. 7 formula (pure arithmetic, bit-identical to caelus’s `julianDay`; 14/14 vectors PASS, 0 mismatches vs caelus over 1800–2100); concrete validation rules (offset ±840, year 1800–2100, day by pure arithmetic — the current `Date.UTC` check has the years-0–99 ↔ 20th-century footgun); deps: remove `caelus`, `caelus-birth` (and `luxon`, only transitive), remove `zod` (recommendation — confirmed with 01), keep `axi-sdk-js` + dev/peer deps. v1’s `status`/`zone`/`dst` on `ResolvedBirth` no longer make sense: 01 decides whether they survive.

## Answer

Resolved (2026-08-18). Research facts (branch `research/calculo-jd-y-deps`, findings in `research/calculo-jd-y-deps.md`) + the zod decision.

**JD calculation**: **Meeus, *Astronomical Algorithms* ch. 7**, pure arithmetic — the same arithmetic caelus already uses (`julianDay`); lumen v2 produces jdUt bit-identical to v1. 14/14 vectors PASS; 0 mismatches vs caelus over 3,096 samples (1800–2100). No time dependencies, no DST table.

**Validation**: rules adopted in ticket 01 (offset ±840, year 1800–2100, day by pure arithmetic, hour 0–23, minute 0–59, lat ±90, lon ±180) — hand-rolled validation, no zod.

**Final dependency tree**:
- Runtime: `axi-sdk-js` (AXI framework + AxiError).
- Dev/peer: `@types/bun`, `@biomejs/biome`, `typescript`.
- **Removed**: `caelus`, `caelus-birth` (nothing in the kept slice needs them; jdUt via pure Meeus), `zod` (**decision: remove** — the ~7-field contract is validated by hand, ~30 lines; natal charts do not return and validating internal output is not a case for zod), `luxon` (only transitive via caelus-birth; it goes away on its own).