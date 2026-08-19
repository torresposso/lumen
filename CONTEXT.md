# Context — lumen v2

The domain language of lumen v2: a birth-profile manager and deterministic
astrological chart engine (AXI CLI). lumen is the deterministic interface — it
validates, derives the Julian Day, persists birth profiles, and calculates
exact natal chart geometry and evolutionary mechanics (JWGEA canon) using
embedded ephemerides (`caelus: 0.24.1`). It never resolves world facts (the agent
resolves geocoding and UTC offset).

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
  arithmetic internal to `src/domain/birth-input.ts`), produced by the birth-input
  contract from the parsed `--when`. lumen's only derivation; it never consults timezone
  databases or calendars (ADR-0014).
- **BirthInput** — the parsed, validated birth produced by the birth-input
  contract: `birthDateTime` (canonical ISO with offset), `birthLat`, `birthLon`,
  `birthPlace` and the derived `birthJdUt`. Produced from `RawBirthInput`. The
  transient `local`/`offsetMinutes` the derivation needs never cross the
  contract's interface — they are implementation, not interface (ADR-0005, ADR-0014).
- **LocalTime** — the transient broken-down local wall-clock (year…minute) the
  birth-input contract yields *internally* from `--when` and feeds to the Meeus
  derivation; never stored or leaked across file seams (ADR-0014).
- **RawBirthInput** — the raw flag strings `profile add` receives, in their
  ergonomic CLI names (ADR-0006): `--when` (ISO 8601 datetime with UTC offset:
  `YYYY-MM-DDTHH:MM±HH:MM` or `…Z`) and `--where "lat, lon, Place"` (coordinates
  then place; the first two comma-separated parts are lat/lon, the rest is the
  place). Parsed and validated into a `BirthInput` whose fields use the model's
  `birth*` names.
- **Birth-input contract** — the module `src/domain/birth-input.ts` that owns the
  parsing, semantic validation, Gregorian calendar checks, and Meeus Julian Day
  derivation as one deep seam (ADR-0014): a single `VALIDATION_ERROR` citing
  every checkable violated rule in its suggestions. It is also the one seam where
  the ergonomic CLI names (`--when`/`--where`) meet the model vocabulary (`birth*`) —
  neither the command nor the store knows the CLI flag names (ADR-0006). The seam is
  *flag-agnostic*: the caller (the `profile add` arm) passes the flag labels from
  the command surface, so the domain module never imports the CLI vocabulary — the
  dependency direction is `commands → domain`, never `domain → cli`. The UTC offset
  arrives *inside* `--when`, never as a separate flag. Flag presence, syntax and value
  normalization belong to the **args contract**; value semantics belong here.
  Raw flags enter, the complete `birth*` set leaves, and neither the command nor
  the store performs the derivation.
- **Args contract** — the module `src/cli/args.ts` that owns the flag and
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
- **Command surface** — the module `src/cli/surface.ts` that owns the
  whole agent-facing CLI vocabulary and bare invocation presentation (ADR-0007, ADR-0014):
  the command token (`lumen profile`), the four arm command-lines, the `--when` /
  `--where` / `--name` flag literals, the canonical add example, the arm catalog,
  the derived top-level Commands block, the shared empty-state / NOT_FOUND hints,
  and `homeView`. The top-level help, the command's usage text and the subcommand
  group name interpolate the tokens; the `add` arm passes the flag labels to the
  **birth-input contract**, which quotes them in its messages — none re-types
  a literal, so a command, arm or flag rename is one edit in this module
  (ADR-0006; ADR-0007). It holds the *names* and the *presentation* rules;
  the birth-input contract holds the *meanings*. It also owns the shared
  empty-state rule — the hint tokens and the selection between them
  (`emptyStateHint`: empty store → add-hint, non-empty → list-hint) live
  beside each other, so `homeView` and the `list` arm never re-implement the
  decision. It derives the top-level "Commands:" block (`formatCommandsHelp`)
  dynamically from registered arm catalogs.
- **Home view** — the summary a bare `lumen` invocation (no command) publishes:
  the profile count plus the command surface's empty-state hint, composed by
  `homeView` directly in `src/cli/surface.ts` (ADR-0014) — "snapshot the store,
  apply the empty-state rule".
- **CLI Context** — the runtime execution context `CliContext` holding the
  capability ports `profiles: ProfileStore` and `ephemeris: Ephemeris`,
  defined at the composition root (`src/cli.ts`) and resolved by
  `buildCliOptions`. `requireCliContext` (also `src/cli.ts`) validates
  presence and fails loud (`CONTEXT_ERROR`) when context is missing.
- **Profile store** — the persistence port `ProfileStore` (`src/domain/store.ts`:
  `list` / `get` / `add` / `remove` — no file policy, no lifecycle) and the
  two SQLite adapters that serve it (`src/storage/profile-store.ts`, sharing
  one internal SQL core): `SqliteProfileStore` — per-project SQLite at
  `./lumen.db` (overridable with `LUMEN_DB`), created lazily only on `add`,
  0600 permissions, dedupe via `UNIQUE INDEX (birth_jd_ut, birth_lat,
  birth_lon)`, migrations via `PRAGMA user_version` (current schema v4) — and
  `InMemoryProfileStore`, a thin wrapper over an injected `bun:sqlite`
  `Database` for tests (same interface, no filesystem side effects). The
  command and the home view type against the port and never create a store —
  the CLI wiring provides one through context. The adapters own profile identity: `add` generates the profile's
  UUID — the command never supplies one.
- **TOON** — the AXI structured-output encoding lumen publishes: display
  precision only (`birthJdUt` 6 decimals, `birthLat`/`birthLon` 4),
  `birthDateTime` echoed as stored (ISO 8601), rounded at output; the DB keeps
  full float64 precision. The published key set derives from the stored
  profile minus its timestamps — never a hand-mirrored duplicate. Policy lives
  in `src/domain/toon.ts`.
- **Natal chart engine** — the complete astrological chart geometry and evolutionary
  facts assembled as a pure function (`computeNatalChart`, `src/engine/natal/index.ts`)
  over a stored `Profile` and `Ephemeris` port, backed by the modular technique package
  (`src/engine/natal/` with `pluto-polarity.ts`, `nodal.ts`, `eclipses.ts`, `patterns.ts`, and shared primitives
  in `src/engine/shared/` for geometry, aspects, and rulerships, delegating base geometry, aspects, and
  ephemerides to the Ephemeris port) published as a single TOON `chart` block
  (ADR-0008, ADR-0009, ADR-0010, ADR-0011, ADR-0012, ADR-0013, ADR-0015, ADR-0016, ADR-0017).
- **Out-of-Bounds** — the astronomical state where a body's declination exceeds the
  maximum true obliquity of the ecliptic for the epoch (~23°26'), carrying core evolutionary
  meaning in JWGEA; calculated via Caelus `outOfBounds` and projected as `outOfBounds: boolean`
  on each body (ADR-0016).
- **Ephemeris seam** — the capability port `Ephemeris` (`src/adapters/ephemeris.ts`)
  wrapping ephemerides (Caelus `Engine.chartAt`, `findAspects`, `declinationAspects`, `outOfBounds`, `returns`,
  `progressedLongitude`, `pheno`, eclipse finders in prod, `InMemoryEphemeris` in tests) with fixed
  Porphyry houses, True North Node, injected through the CLI Context (ADR-0011, ADR-0012, ADR-0013, ADR-0016, ADR-0017).
- **Pluto Polarity Point (PPP)** — the point exactly 180° opposite Pluto on the ecliptic,
  representing the evolutionary axis of conscious choice; it is active unless deactivated
  by Pluto conjunct the True North Node within the deactivation orb (<= 3°).
- **Nodal Axis & Skipped Steps** — the True North Node (`true_node`) and its opposite
  South Node defining the karmic trajectory; any planetary body squaring the nodal axis
  (within 5° orb) is identified as a *Skipped Step* (unresolved evolutionary lessons),
  including its canonical `resolutionNode` ("north" or "south" based on the node it is applying to in retrograde nodal motion).
- **Dispositor Chain** — the directed path of planetary rulerships starting from a body
  or nodal ruler through sign rulers up to a maximum depth, classified with its terminal status:
  `final_dispositor` (domicile), `mutual_reception` (2-body reciprocal loop), or `loop` (multilateral committee).
- **Prenatal Eclipses** — the astronomical solar and lunar eclipses immediately preceding
  the birth instant (`birthJdUt`), projected onto the natal house cusps.
- **True Lilith** — the osculating lunar apogee (`true_lilith`) calculated from the
  lunar Chebyshev series, representing the primordial instinct, repressed trauma, and raw soul truth.
- **Soul Lots (Fortune & Spirit)** — the Hermetic lots of physical incarnation (`fortune`,
  Asc + Moon - Sun by day) and volitional soul purpose / *daimon* (`spirit`, Asc + Sun - Moon by day),
  projected onto natal houses according to chart sect (diurnal vs nocturnal) (ADR-0018).
- **Aspect Stress** — the JWGEA classification of planetary aspects into stressful
  (evolutionary tension/friction: conjunction, square, opposition, semisquare, sesquiquadrate,
  quincunx) and nonstressful (integration/flow: trine, sextile, semisextile, septile,
  quintile, biquintile).
