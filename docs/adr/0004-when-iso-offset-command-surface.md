# `--when` carries an ISO 8601 datetime with offset — `when` is the one name, no `--offset`

The birth moment was supplied as two separate, unlinked flags — `--when`
(local wall-clock `YYYY-MM-DDTHH:MM`) plus `--offset` (integer UTC minutes) —
and stored as five civil columns (`local_year`…`local_minute`) plus
`offset_minutes`. The model then had two names for each concept (`local` vs
`when`, `offset`/`offsetMinutes`), and the agent had to keep two values
consistent. We decided: **the moment is one value.**

- **`--when` is an ISO 8601 datetime with an explicit UTC offset** —
  `YYYY-MM-DDTHH:MM±HH:MM` or `…Z` (offset zero; `Z` kept, not rewritten to
  `+00:00`). This is the IETF-standard representation for a personal birth
  moment (RFC 6350 vCard `BDAY:…T231000Z`). The `--offset` flag is gone; the
  agent still resolves the offset (lumen never touches a timezone database,
  ADR-0002 intact) but now formats it *inside* `--when`.
- **One name, four layers.** `when` is the CLI flag, the TOON output field,
  the model field (`birth.when`, ISO string), and the single DB column.
  This extends the principle already recorded for `birthplace` in ADR-0003:
  *the CLI flag, the model field and the stored column share the name*. The
  civil-clock breakdown and the offset are parsed transiently (the birth-input
  contract yields `clock`/`offsetMinutes` for Meeus) and never stored as
  separate fields — the v2→v3 migration collapses the six columns into one
  quoted `` `when` `` TEXT (a SQL reserved word, hence the quoting).

## Considered Options

- **Keep `--when` + `--offset` as two flags** (status quo): rejected — one
  instant as two independent values invites inconsistency, and the model
  carried the confused dual naming (`local`, `offsetMinutes` vs `offset`).
- **Rename to the relational convention `born_at` / `birthDateTime`** for the
  field/column, keeping `--when` for the flag: rejected — it re-introduces a
  second word per concept across layers, against ADR-0003's one-name
  principle, and forfeits the verbatim round-trip (output `when` copies
  straight back into `--when`). `born_at` is a fine generic convention; this
  repo's documented rule is that the flag, field and column share the name.

## Consequences

- **Agent contract change**: agents must now pass the offset inside `--when`,
  and verbatim round-trip holds — output `when` is copy-paste input.
- `--offset`, `offsetMinutes`, and the civil columns are gone from the model
  and storage; the TOON `offset` output field is gone (`when` carries it).
- `rm` is renamed `delete` in the same surface pass (`lumen profile delete`).
- Migration v3 reconstructs `when` from the stored civil columns + offset for
  existing profiles; dedupe on `(jd_ut, lat, lon)` is unchanged.