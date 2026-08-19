# Lumen Project Audit

Date: 2026-08-18

## Scope

This audit covers the current working tree, including the uncommitted changes
already present in the repository. I did not modify or revert those changes.
The review covered:

- The executable path: `bin/lumen.ts` -> `src/cli.ts` -> command dispatch.
- The argument, birth-input, model, store and TOON modules.
- SQLite creation, permissions, migrations, journaling and adapter lifecycle.
- Unit, integration and schema migration tests.
- `README.md`, `CONTEXT.md`, ADRs and the `.scratch/lumen-v2` documents.
- Static checks and a few focused SQLite reproductions.

## Current Health

The project is small and has a good starting shape. The main seams are visible,
the dependency direction is mostly correct, and the agent-facing behaviour is
well covered for the happy path and ordinary validation failures.

Verification performed against the current tree:

- `bun test`: **118 passed, 0 failed**.
- `bun run typecheck`: **passed**.
- `git diff --check`: **passed**.
- `bun run check:docs`: **passed**, but its coverage is narrower than its name
  suggests (see Finding F10).
- `bun run check`: **failed** only because Biome wants formatting changes in the
  already modified `tests/storage/profile-store.test.ts` lines 171 and 187.

The worktree started with modifications in:

- `src/core/birth-input.ts`
- `src/storage/profile-store.ts`
- `src/storage/schema.ts`
- `tests/storage/profile-store.test.ts`
- `tests/storage/schema.test.ts`

## Findings

Severity uses the following scale:

- **High**: can expose profile data, lose data integrity, or violate the
  documented error contract in a normal operational scenario.
- **Medium**: can produce misleading behaviour, resource leaks, or a contract
  mismatch under an edge case or future extension.
- **Low**: maintainability or documentation friction with limited immediate
  runtime impact.

### F1 — Existing database permissions are not repaired (High)

Evidence: `src/storage/profile-store.ts:144-148` only calls `chmodSync(...,
0o600)` when the database file did not exist. An existing file is opened without
checking or correcting its mode. The README promises `0600` at
`README.md:42-46`, and the storage contract repeats that policy.

I reproduced this with a valid v4 database: changing its mode to `0644`, opening
`SqliteProfileStore`, and reading it leaves the mode at `0644`.

Impact:

- A database copied from another machine, restored from backup, or created by a
  previous version can remain readable by other users on the system.
- The implementation does not maintain the security invariant it documents.

Recommendation:

- Enforce the file mode on every file-backed open, not only on creation.
- Add a test that creates a valid database at `0644`, opens the adapter, and
  asserts `0600`.
- Decide explicitly whether symlinked `LUMEN_DB` paths are allowed. If they are
  not, reject them before opening; otherwise document that the configured path
  is trusted.

### F2 — SQLite operation failures escape as raw errors (High)

Evidence: `SqliteProfileStore.open()` wraps errors while opening and preparing
the schema (`src/storage/profile-store.ts:141-169`), but the CRUD methods at
`src/storage/profile-store.ts:177-193` call `ProfileDb` without an equivalent
error adapter. `ProfileDb` itself performs raw SQLite operations at
`src/storage/profile-store.ts:54-119`.

The CLI contract promises `PROFILE_ERROR` for store failures. That promise is
not true for failures after opening, such as a locked database, a corrupt or
incompatible table, an I/O failure, or a constraint error. A v4 database with
only `id TEXT PRIMARY KEY` is accepted by `ensureSchema`; `list()` returns an
empty result and `add()` raises the raw SQLite error `table profiles has no
column named name`.

Impact:

- Agents receive an inconsistent error shape and cannot reliably decide whether
  to retry, repair the database, or report a profile error.
- A malformed schema can be silently represented as valid-looking empty data.

Recommendation:

- Keep the error adapter local to `src/storage/profile-store.ts`; do not create a
  global error framework. Wrap each public adapter operation in one small helper
  that preserves `AxiError` and converts other failures to `PROFILE_ERROR`.
- Validate the schema shape before exposing a store (see F4), so malformed files
  fail on open rather than during CRUD.
- Add tests for a malformed schema, a closed connection, and an operation-level
  SQLite failure.

### F3 — Schema migrations are not atomic (High)

Evidence: `src/storage/schema.ts:76-117` performs multiple `ALTER TABLE`,
`UPDATE`, `DROP COLUMN`, rename and version statements without an explicit
transaction.

This is not theoretical. A v1 database that already contains a `when` column
allows the first `city` -> `birthplace` rename to commit, then fails on
`ADD COLUMN "when"`. `PRAGMA user_version` remains `1`, but the schema is now
partially migrated. A retry then fails because `city` no longer exists.

Impact:

- A process interruption or a migration error can leave a user database in a
  state that the next invocation cannot recover from.
- The current version marker is not sufficient to describe the actual schema.

Recommendation:

- Run the complete migration path inside one SQLite transaction and update
  `user_version` only within that transaction.
- Add a regression test that forces a migration step to fail and verifies that
  both the version and all columns are unchanged.
- Keep each migration step in `schema.ts`; separate migration files are not
  necessary for the current four-version history.

### F4 — `user_version` is trusted without validating the schema invariant (High)

Evidence: `src/storage/schema.ts:27-37` rejects only versions newer than the
supported version and uses the version number to decide whether work is needed.
For an existing v4 database, no table-column or index validation is performed.
The fresh-install path creates the table and index at `src/storage/schema.ts:58-74`,
but the migration path does not re-assert those invariants.

There is a second concrete gap: if a v1 or v2 file is missing the old unique
birth index, the migration reaches v4 without creating one. The current v1/v2
fixtures do not assert that the index exists after migration; the resulting
database has only the primary-key auto-index.

Impact:

- A file can claim to be v4 while missing required columns or deduplication.
- `add` may create duplicate births or fail much later with a raw SQL error.
- The adapter's type-level `Profile` shape can contain `undefined` values when a
  malformed table happens to return rows.

Recommendation:

- After a fresh install or migration, validate the required columns and the
  unique `(birth_jd_ut, birth_lat, birth_lon)` index.
- For a file that is marked v4 but fails validation, throw a clear
  `PROFILE_ERROR` with repair guidance.
- Ensure the unique index as part of the post-migration invariant, while
  handling duplicate legacy data explicitly instead of silently discarding rows.

### F5 — Adapter lifecycle is inconsistent and schema-open failures leak handles (Medium)

Evidence:

- `SqliteProfileStore.close()` resets the adapter and permits a later read to
  reopen it (`src/storage/profile-store.ts:130-202`).
- `InMemoryProfileStore.close()` closes its database but leaves `core` usable;
  a later operation raises `RangeError: Cannot use a closed database`
  (`src/storage/profile-store.ts:211-243`).
- In `SqliteProfileStore.open()`, the local `database` is assigned to
  `this.database` only after `ensureSchema` succeeds (`:149-155`). If schema
  preparation throws, the local handle is not closed before the error is
  propagated.

Impact:

- The two adapters behind the same port have different post-close behaviour.
- Repeated attempts to open a bad database can retain native SQLite handles.
- The port intentionally hides lifecycle, but the concrete adapters still need
  a predictable lifecycle for tests and embedding.

Recommendation:

- Make close semantics explicit and identical: either make close terminal and
  reject later operations with `PROFILE_ERROR`, or make both adapters reopenable.
  The simpler production choice is terminal close plus a `finally` in `main`.
- Close a newly opened local handle when schema setup fails.
- Keep `close()` off `ProfileStore`; lifecycle belongs to the composition root and
  concrete adapters, not to command code.

### F6 — Inherited property names can bypass unknown-command handling (Medium)

Evidence: `src/core/subcommand.ts:65-93` dispatches with
`group.subcommands[subName]`. Because `subcommands` is an ordinary object,
names such as `constructor`, `__proto__` and `toString` resolve inherited
properties instead of being treated as unknown arms.

For example, `lumen profile constructor` can enter the inherited constructor
function and fail with a raw `TypeError` while trying to read `spec.positionals`,
instead of returning the documented `VALIDATION_ERROR` for an unknown command.

Impact:

- A validly shaped but unknown agent input receives an unclassified runtime
  failure.
- Command registration becomes fragile if it is later assembled dynamically.

Recommendation:

- Dispatch only own properties, for example with `Object.hasOwn`.
- Add regression tests for `constructor`, `__proto__` and `toString`.

### F7 — The UUID-only contract is not enforced as syntax (Medium)

Evidence: `ID_SPEC` at `src/commands/profile.ts:72-78` checks only that one
positional argument exists. `get` and `delete` then pass any string directly to
the store at `src/commands/profile.ts:121-144`.

The docs say `get`/`delete` accept a UUID only. Today, `get missing` is treated as
a lookup for an arbitrary string and returns `NOT_FOUND`, not `VALIDATION_ERROR`.

This may be intentional if “UUID only” means “the only lookup key is the opaque
ID generated by lumen”, but the distinction is not recorded.

Recommendation:

- Choose one contract and document it:
  - validate canonical UUID syntax in the args/domain contract and return
    `VALIDATION_ERROR` for malformed IDs; or
  - explicitly define IDs as opaque strings and change the docs to stop saying
    UUID-only at the validation level.
- Add tests for a malformed ID and a well-formed unknown UUID.

### F8 — The storage port accepts invalid runtime values outside the CLI path (Medium)

Evidence: `NewProfile` is a TypeScript type only (`src/core/model.ts:18-21`),
and `ProfileDb.add()` writes its fields directly at
`src/storage/profile-store.ts:75-96`. The CLI validates values in
`parseBirthInput`, but the adapter itself has no runtime checks beyond SQLite's
`NOT NULL` constraints.

Impact:

- Direct adapter consumers, future commands, scripts or manual database writes
  can persist malformed dates, invalid coordinates, non-finite numbers or an
  inconsistent `birthJdUt`.
- Later deduplication and TOON output can become unreliable even though the
  TypeScript types appear valid.

Recommendation:

- Keep CLI-specific parsing in `birth-input.ts`, but enforce storage invariants
  at the adapter seam for values that must never be persisted.
- Add SQLite checks for coordinate ranges and finite numeric values where the
  SQLite representation supports them.
- Test direct adapter calls with invalid values. Do not duplicate the complete
  CLI parser in storage.

### F9 — `add()` has a concurrent read-after-write gap (Medium)

Evidence: `ProfileDb.add()` inserts or deduplicates and then performs a separate
`SELECT` at `src/storage/profile-store.ts:75-112`.

Another process or maintenance connection can remove the row between those two
operations. Both branches then cast a possibly missing row to `Profile`, so the
command can publish an undefined-shaped object or fail later inside
`toonProfile`.

Impact:

- Concurrent CLI processes can produce a raw runtime failure despite the
  documented `AddResult` contract.
- The database's uniqueness constraint protects insertion, but not the
  readback used to construct the result.

Recommendation:

- Use `INSERT ... RETURNING` where Bun/SQLite support it, or wrap insert and
  readback in a transaction with appropriate locking.
- If the row is unexpectedly absent, throw a `PROFILE_ERROR` rather than using a
  type assertion.
- Add a simulated delete-between-insert/readback test or a multi-process test
  before relying on concurrent use.

### F10 — Documentation parity checks a narrow historical slice (Medium)

Evidence:

- `scripts/check-docs.ts:39-73` checks only command names in one fenced block of
  `.scratch/lumen-v2/spec.md`.
- `scripts/check-docs.ts:79-115` checks only the immediate `src/` directory tree;
  nested source directories are invisible to it.
- It does not validate the live flags, usage text, schema policy, README,
  `CONTEXT.md`, ADRs, or issue files.

The check passes while the repository contains known historical contradictions:

- `.scratch/lumen-v2/spec.md:18-19` still describes the old `--birth*` model
  flags, despite the current `--when`/`--where` surface.
- `.scratch/lumen-v2/map.md:7,24-25` still says `rm`, `--offset`, `--at` and
  `--city`.
- `.scratch/lumen-v2/issues/04-cli-surface.md:20-32` describes the superseded
  CLI.
- Several ADRs intentionally preserve historical decisions but do not always
  make the current replacement prominent.

Impact:

- An agent following the checked spec can generate commands that the binary does
  not accept.
- Future file additions can bypass the tree parity check.

Recommendation:

- Mark `.scratch/lumen-v2` explicitly as historical, or update it to the final
  contract before using it as a gate. Do not leave it half-live.
- Keep `CONTEXT.md` and `README.md` aligned with the shipped interface.
- Improve the check only where it buys leverage: recursively enumerate `src/`
  and verify the small set of public CLI tokens. Do not build a general Markdown
  parser for this project.

### F11 — The command-surface module has accumulated unrelated orchestration (Low)

Evidence: `src/core/cli-surface.ts:13-89` owns both CLI vocabulary/help and
`homeView`, which reads from `ProfileStore` and composes a store-backed response.
The module is now a names catalog, help renderer, empty-state policy and view
query at once.

Impact:

- A vocabulary-only change requires understanding storage-backed behaviour.
- The module's interface is wider than the command surface concept suggests.
- The dependency from surface/presentation code to the storage port is easy to
  grow accidentally.

Recommendation:

- Move only `homeView` to a small `src/core/home.ts` (or
  `src/commands/home.ts`) module.
- Leave tokens, hints, arm help and `profileCommandsHelp` together in
  `cli-surface.ts`.
- Do not split `profile.ts` into four files yet. Four small arms in one command
  module are still local and readable; splitting them now would add ceremony
  without a second real adapter or a larger domain.

## Coverage Blindspots

The existing 118 tests cover the core contracts well, but the following risks
are currently untested:

- Existing database with unsafe permissions.
- Directory/file creation races and symlinked `LUMEN_DB` paths.
- Store operation errors after a successful open.
- Malformed v4 schema and missing required unique index.
- Migration rollback after a mid-path failure.
- Closing and reusing both concrete adapters.
- Unknown subcommands named `constructor`, `__proto__` or `toString`.
- Runtime validation of direct `ProfileStore.add()` inputs.
- Concurrent readers/writers and the behaviour of a locked database.
- Delete-between-insert/readback behaviour in `add()`.
- Canonical UUID validation, if that is part of the intended contract.
- End-to-end `bin/lumen.ts` execution and cleanup after a CLI failure.
- Formatting gate failure in the current dirty test file.

## Pragmatic Modular Structure

The current layered direction is fundamentally right:

```text
bin/lumen.ts             executable and fast path
src/cli.ts               composition root and AXI wiring
src/commands/profile.ts  protocol adapter and arm orchestration
src/core/                pure contracts, model and display policy
src/storage/             SQLite adapters and schema lifecycle
```

Do not introduce `domain/`, `application/`, `infrastructure/`, repository
classes, dependency-injection containers or a global error module. There is one
real production adapter today, one test adapter, and one CLI command group.

The target shape should stay almost identical, with one small extraction:

```text
src/
  cli.ts
  commands/
    profile.ts
  core/
    args.ts            # raw flag/positional syntax contract
    birth-input.ts     # --when/--where semantics and JD derivation
    cli-surface.ts     # command/flag tokens, hints and help catalog only
    context.ts         # CLI context guard
    home.ts            # store-backed bare-invocation view
    jd.ts              # pure Meeus arithmetic
    model.ts           # BirthInput/NewProfile/Profile
    store.ts           # narrow ProfileStore port
    subcommand.ts      # shared parse/help/dispatch choreography
    toon.ts            # output shape and display precision
  storage/
    schema.ts          # DDL, migrations and schema invariant checks
    profile-store.ts   # file adapter, test adapter and shared SQL core
```

Dependency direction:

```text
cli -> commands -> core contracts
cli -> storage adapters        (composition only)
storage -> core model/port
core -> no runtime dependency on storage
```

The useful deep modules are already present:

- `args.ts`: one syntax verdict for an arm.
- `birth-input.ts`: raw birth values in, complete validated `birth*` values out.
- `ProfileStore`: four operations and no file policy.
- `schema.ts`: one place for schema lifecycle and migrations.
- `subcommand.ts`: one parse/help/dispatch implementation for all arms.

The modular improvement is to harden these seams, not multiply them.

## Recommended Execution Order

1. Fix the current Biome formatting failure in the already modified test file.
2. Make schema migrations transactional and validate the final table/index
   invariant.
3. Enforce `0600` for every existing file-backed database and close local
   handles on failed setup.
4. Normalize all file-adapter CRUD failures to `PROFILE_ERROR` and define a
   simple close policy.
5. Decide and test the UUID syntax contract.
6. Move `homeView` out of `cli-surface.ts` only when touching that area next.
7. Mark or update the historical `.scratch/lumen-v2` documents and extend the
   parity check only for the current contract.

## Bottom Line

Lumen is not suffering from a missing architecture. It is suffering from a few
unprotected invariants at the SQLite seam and from documentation that has not
been retired after several surface refactors. Preserve the current small layered
shape, make the storage adapter the authoritative owner of security, migration
and error invariants, and avoid a larger architectural rewrite until a second
real command or storage adapter creates new variation.
