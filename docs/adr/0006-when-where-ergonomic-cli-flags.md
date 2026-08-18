# CLI flags are ergonomic `--when` / `--where`; the data model keeps the flat `birth*` vocabulary

ADR-0005 aligned the CLI flags with the model/DB/TOON under the single `birth*`
token family (`--birthdatetime` / `--birthlat` / `--birthlon` / `--birthplace`).
Reviewing the agent-facing surface, the captain found four `--birth…` flags
verbose for the command that is the whole product, and wanted the birth moment
and place bundled the way an agent actually reason about them. We decided: **the
CLI speaks ergonomically, the model speaks `birth*` — the two are decoupled.**

- **The CLI is two flags:**
  - `--when "YYYY-MM-DDTHH:MM±HH:MM"` — the ISO 8601 birth moment with explicit
    UTC offset (the `--offset` flag stays gone; ADR-0004 kept).
  - `--where "lat, lon, Place"` — coordinates then the human-readable place,
    one flag. The first two comma-separated parts are `birthLat`/`birthLon`; the
    remainder (which may itself contain commas, e.g. `"Magangué, Colombia"`) is
    `birthPlace`. This replaces `--birthlat`, `--birthlon` and `--birthplace`.
  - `--name` (optional slug) is unchanged.
- **The model, DB and TOON are unchanged** from ADR-0005: flat `birthPlace`,
  `birthDateTime`, `birthLat`, `birthLon`, `birthJdUt`; columns
  `birth_place`/`birth_date_time`/`birth_lat`/`birth_lon`/`birth_jd_ut`;
  dedupe on `(birth_jd_ut, birth_lat, birth_lon)`. Nothing storage-side changes;
  schema stays v4.
- **The mapping is confined to one seam** (`src/core/birth-input.ts`,
  `RawBirthInput { when, where }`): it parses both flags and emits a `BirthInput`
  whose fields are the model's `birth*` names. Neither the command nor the store
  knows `--when`/`--where`.
- **This relaxes, not reverses, ADR-0005.** ADR-0005's "same token family
  across flag, model and column" now applies to the *data layer* (model ↔ DB ↔
  TOON). The CLI is a separate ergonomic surface that maps onto it at the single
  birth-input seam; flag name ≠ field name is deliberate.

## Considered Options

- **Keep ADR-0005's four `--birth…` flags** (status quo): rejected — verbose for
  the primary command; `--where "9.15, -74.75, Magangué, Colombia"` reads the
  way the agent (re)states the birth.
- **Also rename the model/DB/TOON to `when`/`where`**: rejected — `where` has
  no single model value (it bundles lat+lon+place), so the flat `birth*` model
  would collapse or become a nested/opaque object, losing ADR-0005's
  self-describing fields. Keeping the descriptive model and the ergonomic CLI is
  the smallest, least-broken change.
- **`--where` coordinates only, `--birthplace` separate**: rejected — the
  captain's example bundles the place into `--where`, and the place is not
  identity, so it belongs with the coordinates, not as a third flag.

## Consequences

- **Agent contract is now**: `lumen profile add --when "1981-01-26T00:50-05:00" --where "9.15, -74.75, Magangué, Colombia" [--name slug]`.
- `--birthdatetime`, `--birthlat`, `--birthlon` and `--birthplace` are gone from
  the CLI (the `birthplace`/`birth` terms remain in the model/TOON output).
- The birth-input seam is where CLI ergonomics meet model vocabulary; a future
  flag rename touches only that seam.
- Storage, schema (v4), migrations and dedupe are untouched.
- *Update (2026-08-18, ADR-0007):* the ergonomic literals and the canonical
  example now live in the add surface (`src/core/cli-surface.ts`); the
  "rename touches only that seam" consequence above is realised by that one
  module — the birth-input seam keeps the semantics, the add surface holds
  the names.
