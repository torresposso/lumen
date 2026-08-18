# Context — lumen v2

The domain language of lumen v2: a birth-profile manager (AXI CLI). lumen is the
deterministic interface — it validates, derives the Julian Day and persists; it
never resolves world facts (the agent resolves geocoding and UTC offset).

The v1 astrology vocabulary (chart, evo, journey, karma, draconic, projection…) is
gone with the pivot; do not expect it here.

Code and documentation are always written in English — Spanish is reserved for
conversation between the human and the agent, never for what gets persisted or
pushed.

## Language

- **Profile** — a stored birth profile: auto-generated UUID `id`, optional
  descriptive `name` (no lookup), required human-readable **birthplace**, and
  the resolved **birth**. The unit of `profile add | list | get | delete`.
- **Birthplace** — the human-readable place where a birth happened, provided
  by the human and stored as-is (e.g. `"Magangué, Colombia"`). The domain
  term is *birthplace*, not *city*: a birth can happen anywhere, and the
  agent (not lumen) resolves coordinates and offset from it. The CLI flag,
  the model field and the stored column share the name.
- **Birth** — the moment and place of a birth as the agent supplied them: the
  **when** value (ISO 8601 datetime with UTC offset, e.g.
  `1990-06-10T14:30-04:00`), coordinates (`lat`/`lon`), and the derived
  **jdUt**. The birth is the profile's identity: `add` deduplicates on
  `jdUt + lat + lon`, discarding the second `add`'s name/birthplace.
- **BirthInput** — the parsed, validated birth input: the canonical `when`
  (ISO 8601 with offset), the transient `clock`/`offsetMinutes` the Julian-Day
  computation needs, and decimal `lat`/`lon`. Produced by the birth-input
  contract from `RawBirthInput`.
- **RawBirthInput** — the raw flag strings `profile add` receives: `--when`
  (ISO 8601 datetime with UTC offset: `YYYY-MM-DDTHH:MM±HH:MM` or `…Z`) and
  `--at` (`lat,lon` decimal degrees). Parsed and validated into a `BirthInput`.
- **Birth-input contract** — the module `src/core/birth-input.ts` that owns the
  parsing + semantic validation of those raw flags as one seam: a single
  `VALIDATION_ERROR` citing every checkable violated rule in its suggestions.
  The UTC offset arrives *inside* `--when`, never as a separate flag. Flag
  presence, syntax and value normalization belong to the **args contract**;
  value semantics belong here.
- **Args contract** — the module `src/core/args.ts` that owns the flag and
  positional syntax of every command's raw arguments as one seam: known and
  required flags, `--flag=value` / `--flag value` forms, duplicates, missing
  values, `--help`, positional counts and per-flag **value normalization**
  (trim, empty-means-null, non-empty), accumulating every violation into a
  single `VALIDATION_ERROR` citing each rule. Syntax, presence and value
  normalization live here; value *semantics* (format + ranges) live in the
  contract that consumes the parsed flags (the **birth-input contract**).
- **Julian Day (jdUt)** — the UT instant of a birth, derived in
  `src/core/jd.ts` by Meeus ch. 7 pure arithmetic. lumen's only derivation;
  it never consults timezone databases or calendars.
- **Profile store** — the persistence module `src/storage/profile-store.ts`:
  per-project SQLite at `./lumen.db` (overridable with `LUMEN_DB`), created
  lazily only on `add`, dedupe via `UNIQUE INDEX (jd_ut, lat, lon)`, migrations
  via `PRAGMA user_version`. The command never creates a store — the CLI wiring
  provides it through context.
- **TOON** — the AXI structured-output encoding lumen publishes: display
  precision only (jdUt 6 decimals, lat/lon 4), `when` echoed as stored
  (ISO 8601), rounded at output; the DB keeps full float64 precision. Policy
  lives in `src/core/toon.ts`.
