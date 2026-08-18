# Flat `birth*` vocabulary — one token family across flag, model and column

ADR-0004 named the birth moment **`when`** and flattened the offset inside it,
but kept a nested `birth` object for the moment, coordinates and derived Julian
Day. Reviewing the surface, the captain wanted each birth field to carry its
identity in a `birth*` prefix and the model flattened, so every field self-documents
its owner. We decided: **the model is flat, and every birth field shares the
`birth*` token family.**

- **Profile is flat** — there is no nested `birth` object:
  `id`, `name`, `birthPlace`, `birthDateTime`, `birthLat`, `birthLon`,
  `birthJdUt`, `createdAt`, `updatedAt`.
- **`--birthdatetime` is the ISO 8601 moment with an explicit UTC offset**
  (`YYYY-MM-DDTHH:MM±HH:MM` or `…Z`). The `--offset` flag stays gone (ADR-0004's
  insight kept: the moment is one value, offset rides inside it). The flag
  `--when` is renamed `--birthdatetime`.
- **Coordinates are two flags, not one**: `--birthlat <lat>` and
  `--birthlon <lon>` (they map 1:1 to `birthLat`/`birthLon`). The combined
  `--at "lat,lon"` flag is gone.
- **One *token family*, four layers.** ADR-0003/0004 said flag = model = column
  share the *name*. With multiword `birth*` fields that relaxes to *same token
  family*: flag `--birthdatetime` (lowercase, connected), model field
  `birthDateTime` (camelCase), TOON output `birthDateTime`, DB column
  `birth_date_time` (snake_case). The `birth` morpheme is the invariant.
- **The transient breakdown stays internal.** Parsing
  `--birthdatetime` yields a `local` wall-clock (`LocalTime`) and an
  `offsetMinutes` that feed `julianDayUt` (Meeus ch. 7) and are **never
  stored** — only the canonical `birthDateTime` string is persisted. This also
  retires the `BirthClock`/`meeusJdUt` names (`LocalTime`/`julianDayUt`).

## Considered Options

- **Keep `when` / `at` in a nested `birth` object** (ADR-0004 shape): rejected —
  the captain disliked the `the`-style generic tokens and the nested object;
  `birth*` fields read self-descriptively and flatten the model.
- **Only rename the moment (`birthDateTime`), keep `--at "lat,lon"`**: rejected —
  it left the coordinates as an opaque combined flag and a non-`birth*`
  outlier; `birthLat`/`birthLon` map one-to-one to the model.
- **`born_at` / `coordinates { lat, lon }` relational naming**: rejected — two
  non-`birth*` tokens, against the flat family.

## Consequences

- **Agent contract change**: agents now call
  `lumen profile add --birthdatetime "…±HH:MM" --birthlat <lat> --birthlon <lon> --birthplace "<place>"`.
- `when`, `at`, and the nested `birth` object are gone from the model, CLI and
  storage; the TOON output publishes `birthPlace`, `birthDateTime`, `birthLat`,
  `birthLon`, `birthJdUt`.
- **Schema v4**: columns `birth_place`, `birth_date_time`, `birth_lat`,
  `birth_lon`, `birth_jd_ut`; dedupe on `(birth_jd_ut, birth_lat, birth_lon)`.
  Migration renames every pre-v4 db (v1/v2 converge through the ADR-0004 `when`
  collapse) to the `birth_*` names, which also drops the `when` SQL quoting.
- **Supersedes ADR-0004** for the moment/coordinate naming only; ADR-0004's
  "moment is one value, no `--offset`" remains in force.
