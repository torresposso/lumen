# Context — lumen v2

The domain language of lumen v2: a birth-profile manager (AXI CLI). lumen is the
deterministic interface — it validates, derives the Julian Day and persists; it
never resolves world facts (the agent resolves geocoding and UTC offset).

The v1 astrology vocabulary (chart, evo, journey, karma, draconic, projection…)
is gone with the pivot; do not expect it here.

Code and documentation are always written in English — Spanish is reserved for
conversation between the human and the agent, never for what gets persisted or
pushed.

## Language

- **Profile** — a stored birth profile: auto-generated UUID `id`, optional
  descriptive `name` (no lookup), and the flat `birth*` fields. The unit of
  `profile add | list | get | delete`.
- **Birth** — the moment and place of a birth as the agent supplied them. In the
  model it is flat: `birthPlace`, `birthDateTime`, `birthLat`, `birthLon` and
  the derived `birthJdUt`. The birth is the profile's identity: `add`
  deduplicates on `birthJdUt + birthLat + birthLon`, discarding the second
  `add`'s name/birthPlace.
- **Birthplace** — the human-readable place where a birth happened, provided
  by the human and stored as-is (e.g. `"Magangué, Colombia"`; model field
  `birthPlace`). The domain term is *birthplace*, not *city*: a birth can happen
  anywhere, and the agent (not lumen) resolves coordinates and offset from it.
- **BirthDateTime** — the birth moment as an **ISO 8601 datetime with explicit
  UTC offset** (e.g. `1990-06-10T14:30-04:00` or `…Z`): the CLI flag
  `--birthdatetime`, the model field `birthDateTime` and the stored column
  `birth_date_time`. The offset rides inside it — there is no separate offset
  value. lumen never touches a timezone database.
- **BirthLat / BirthLon** — the decimal coordinates of the birth: CLI flags
  `--birthlat` / `--birthlon`, model `birthLat` / `birthLon`, columns
  `birth_lat` / `birth_lon`. Together with `birthJdUt` they are the birth's
  identity for dedupe.
- **BirthJdUt** — the derived UT instant of a birth (Meeus ch. 7, pure
  arithmetic in `src/core/jd.ts`). lumen's only derivation; it never consults
  timezone databases or calendars.
- **BirthInput** — the parsed, validated birth input produced by the birth-input
  contract: the canonical `birthDateTime` (ISO with offset), the transient
  `local`/`offsetMinutes` the Julian-Day computation needs, and `birthLat`/
  `birthLon`. Produced from `RawBirthInput`.
- **LocalTime** — the transient broken-down local wall-clock (year…minute) the
  birth-input contract yields from `--birthdatetime`; fed to `julianDayUt` and
  never stored. (Formerly `BirthClock`.)
- **RawBirthInput** — the raw flag strings `profile add` receives:
  `--birthdatetime` (ISO 8601 datetime with UTC offset: `YYYY-MM-DDTHH:MM±HH:MM`
  or `…Z`), `--birthlat` and `--birthlon` (signed decimal degrees). Parsed and
  validated into a `BirthInput`.
- **Birth-input contract** — the module `src/core/birth-input.ts` that owns the
  parsing + semantic validation of those raw flags as one seam: a single
  `VALIDATION_ERROR` citing every checkable violated rule in its suggestions.
  The UTC offset arrives *inside* `--birthdatetime`, never as a separate flag.
  Flag presence, syntax and value normalization belong to the **args contract**;
  value semantics belong here.
- **Args contract** — the module `src/core/args.ts` that owns the flag and
  positional syntax of every command's raw arguments as one seam: known and
  required flags, `--flag=value` / `--flag value` forms, duplicates, missing
  values, `--help`, positional counts and per-flag **value normalization**
  (trim, empty-means-null, non-empty), accumulating every violation into a
  single `VALIDATION_ERROR` citing each rule. Syntax, presence and value
  normalization live here; value *semantics* (format + ranges) live in the
  contract that consumes the parsed flags (the **birth-input contract**).
- **Profile store** — the persistence module `src/storage/profile-store.ts`:
  per-project SQLite at `./lumen.db` (overridable with `LUMEN_DB`), created
  lazily only on `add`, dedupe via `UNIQUE INDEX (birth_jd_ut, birth_lat,
  birth_lon)`, migrations via `PRAGMA user_version` (current schema v4). The
  command never creates a store — the CLI wiring provides it through context.
- **TOON** — the AXI structured-output encoding lumen publishes: display
  precision only (`birthJdUt` 6 decimals, `birthLat`/`birthLon` 4),
  `birthDateTime` echoed as stored (ISO 8601), rounded at output; the DB keeps
  full float64 precision. Policy lives in `src/core/toon.ts`.
