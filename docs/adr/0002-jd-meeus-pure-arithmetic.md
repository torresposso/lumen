# jdUt via Meeus pure arithmetic — no date/time library, no timezone resolution

v1 derived the Julian Day through `caelus-birth`, which resolved IANA zones
(tz-lookup + luxon) to an offset and delegated the JD to caelus's
`julianDay`. In v2 the **agent provides the UTC offset explicitly** (the
human only gives city + country + local birth time), so there is nothing to
resolve and no reason to carry date libraries. We decided: **jdUt is computed
by lumen with the Meeus *Astronomical Algorithms* ch. 7 formula in pure
arithmetic** — the exact arithmetic caelus already used (`julianDay`), so v2
produces bit-identical values to v1 for the same UT instant (verified:
14/14 reference vectors, 0 mismatches vs caelus over 1800–2100). The ported
test suite covers the **13 expressible vectors** — research vector #12 carries
seconds, which the minute-granular v2 contract cannot express (see the note in
`tests/jd.test.ts`).

## Considered Options

- Keep `caelus` / `caelus-birth` for just the JD: rejected — everything else
  they provide (zone resolution, ephemerides, astrology) is out of scope; a
  30-line pure function replaces the slice we need.
- `zod` for input validation: rejected with the same logic — the ~7-field
  contract (offset ±840, year 1800–2100, day by pure-arithmetic leap rule,
  hour 0–23, minute 0–59, lat ±90, lon ±180) is hand-rolled in the
  birth-input contract; no schema library is worth a dependency.
- Bun has no native Temporal; additions like `temporal-polyfill` or `luxon`
  were considered and rejected — the formula needs none of them.

## Consequences

- **No DST / zone ambiguity by construction**: an explicit offset means no
  transitions, no `status`/`zone`/`dst` fields (they were removed from the
  model).
- Leap seconds are intentionally ignored (documented in
  `research/calculo-jd-y-deps.md`): input arrives in minutes, a ≤1 s
  discrepancy is ~1.2×10⁻⁵ day — irrelevant for the jdUt use case.
- The formula is proleptic-Gregorian by nature; the validated range
  (1800–2100) never touches the 1582 calendar reform, so it is safe as-is.