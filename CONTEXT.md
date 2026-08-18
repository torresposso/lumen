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
  The CLI supplies it as the tail of `--where` (ADR-0006).
- **BirthDateTime** — the birth moment as an **ISO 8601 datetime with explicit
  UTC offset** (e.g. `1990-06-10T14:30-04:00` or `…Z`): the model field
  `birthDateTime` and the stored column `birth_date_time`. The CLI flag is
  `--when` (a different, ergonomic name — ADR-0006). The offset rides inside it —
  there is no separate offset value. lumen never touches a timezone database.
- **BirthLat / BirthLon** — the decimal coordinates of the birth: model
  `birthLat` / `birthLon`, columns `birth_lat` / `birth_lon`. The CLI supplies
  them as the two leading parts of `--where "lat, lon, Place"`. Together with
  `birthJdUt` they are the birth's identity for dedupe.
- **BirthJdUt** — the derived UT instant of a birth (Meeus ch. 7, pure
  arithmetic in `src/core/jd.ts`), produced by the birth-input contract from the
  parsed `--when`. lumen's only derivation; it never consults timezone databases
  or calendars.
- **BirthInput** — the parsed, validated birth produced by the birth-input
  contract: `birthDateTime` (canonical ISO with offset), `birthLat`, `birthLon`,
  `birthPlace` and the derived `birthJdUt`. Produced from `RawBirthInput`. The
  transient `local`/`offsetMinutes` the derivation needs never cross the
  contract's interface — they are implementation, not interface (ADR-0005).
- **LocalTime** — the transient broken-down local wall-clock (year…minute) the
  birth-input contract yields *internally* from `--when` and feeds to
  `julianDayUt`; never stored and never part of a published interface.
  (Formerly `BirthClock`.)
- **RawBirthInput** — the raw flag strings `profile add` receives, in their
  ergonomic CLI names (ADR-0006): `--when` (ISO 8601 datetime with UTC offset:
  `YYYY-MM-DDTHH:MM±HH:MM` or `…Z`) and `--where "lat, lon, Place"` (coordinates
  then place; the first two comma-separated parts are lat/lon, the rest is the
  place). Parsed and validated into a `BirthInput` whose fields use the model's
  `birth*` names.
- **Birth-input contract** — the module `src/core/birth-input.ts` that owns the
  parsing + semantic validation of those raw flags as one seam: a single
  `VALIDATION_ERROR` citing every checkable violated rule in its suggestions.
  It is also the one seam where the ergonomic CLI names (`--when`/`--where`) meet
  the model vocabulary (`birth*`) — neither the command nor the store knows the
  CLI flag names (ADR-0006). The UTC offset arrives *inside* `--when`, never as a
  separate flag. Flag presence, syntax and value normalization belong to the
  **args contract**; value semantics belong here. The contract also derives
  `birthJdUt` (Meeus, via `src/core/jd.ts`) — raw flags enter, the complete
  `birth*` set leaves, and neither the command nor the store performs the
  derivation.
- **Args contract** — the module `src/core/args.ts` that owns the flag and
  positional syntax of every command's raw arguments as one seam: known and
  required flags, `--flag=value` / `--flag value` forms, duplicates, missing
  values, `--help` (one rule, one home: a bare `--help` in any spelling wins
  over every other check anywhere in the arg list — the subcommand runner
  consults it before routing too, so the promise holds at the group seam),
  positional counts and per-flag **value normalization** (trim,
  empty-means-null, non-empty), accumulating every violation into a
  single `VALIDATION_ERROR` citing each rule. Syntax, presence and value
  normalization live here; value *semantics* (format + ranges) live in the
  contract that consumes the parsed flags (the **birth-input contract**).
- **Command surface** — the module `src/core/cli-surface.ts` that owns the
  whole agent-facing CLI vocabulary (formerly *add surface*; widened
  2026-08-18, ADR-0007): the command token (`lumen profile`), the four arm
  command-lines, the `--when` / `--where` / `--name` flag literals, the
  canonical add example and the shared empty-state / NOT_FOUND hints. The
  top-level help, the command's usage text, the subcommand group name and the
  birth-input contract's messages interpolate the tokens — none re-types a
  literal, so a command, arm or flag rename is one edit in this module
  (ADR-0006; ADR-0007). It holds the *names*; the birth-input contract holds
  the *meanings*. It also owns the shared empty-state rule — the hint tokens
  and the selection between them (`emptyStateHint`: empty store → add-hint,
  non-empty → list-hint) live beside each other, so `home` and the `list` arm
  never re-implement the decision.
- **Profile store** — the persistence port `ProfileStore` (`src/core/types.ts`:
  `list` / `get` / `add` / `remove` — no file policy, no lifecycle) and the
  SQLite adapter `SqliteProfileStore` (`src/storage/profile-store.ts`) that
  serves it: per-project SQLite at `./lumen.db` (overridable with `LUMEN_DB`),
  created lazily only on `add`, dedupe via `UNIQUE INDEX (birth_jd_ut,
  birth_lat, birth_lon)`, migrations via `PRAGMA user_version` (current schema
  v4). The command types against the port and never creates a store — the CLI
  wiring provides one through context. The adapter owns profile identity:
  `add` generates the profile's UUID — the command never supplies one.
- **TOON** — the AXI structured-output encoding lumen publishes: display
  precision only (`birthJdUt` 6 decimals, `birthLat`/`birthLon` 4),
  `birthDateTime` echoed as stored (ISO 8601), rounded at output; the DB keeps
  full float64 precision. Policy lives in `src/core/toon.ts`.
