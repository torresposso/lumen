# Profile identity is the birth — dedupe on jdUt + lat + lon

The natural reading of a "profile" is a person record keyed by an id or a
name, which invites upsert-by-id or lookup-by-name. We decided the opposite:
**the birth is the storage identity**. A profile is its resolved birth instant
(`jdUt + lat + lon`); `add` deduplicates on it via
`CREATE UNIQUE INDEX (jd_ut, lat, lon)` + `INSERT … ON CONFLICT`, returning
the existing profile (the second `add`'s `name`/`birthplace` are discarded). The
`id` is an auto-generated opaque UUID — the internal primary key, never supplied
by the CLI. **The CLI lookup key is the unique `name`**: `get`/`delete`/`chart *`
resolve by `name` only (via `getByName`/`removeByName`); there is no lookup by
UUID, birthplace, or birth from the CLI.

## Considered Options

- Agent-supplied slug id (v1 style, e.g. `erik`) with upsert: rejected —
  slugs invite collisions, renames and "id as description" confusion.
- Allow duplicate profiles: rejected — two profiles for the same birth would
  make `rm` ambiguous and rot the data set silently.
- Lookup by UUID at the CLI: rejected (2026-08-21) — the UUID is an opaque
  internal key; exposing it forced agents to copy machine ids. The human-supplied
  `name` is the stable, memorable lookup key.
- Require a unique `name` at `add` (2026-08-21): accepted — `add` rejects a
  duplicate `name` with `VALIDATION_ERROR` and a `UNIQUE` index guards it. A
  unique name is the CLI identity; the birth remains the storage dedupe.

## Consequences

- `add` of an already-known birth is effectively idempotent: the caller gets
  the canonical profile back, so agents can re-add safely without a `get`
  pre-flight.
- The `birthplace` field is display metadata only — never identity, never a
  lookup key. This is why the model carries it off the uniqueness path (it is
  discarded on conflict). The CLI flag, the model field and the stored column
  share the `birthplace` name: the v1→v2 schema migration renamed the stored
  column from `city` (2026-08-18), and the CLI flag followed, replacing
  `--city`.
- The `name` is the required, unique CLI lookup key (since 2026-08-21): the
  model field, the `--name` flag and the stored `name` column form the lookup
  identity, guarded by `UNIQUE INDEX (name)`. It is no longer optional display
  metadata — `add` validates it non-empty and rejects duplicates. The birth
  remains the storage dedupe, so a unique name and an existing birth with a
  *different* name still collide on the birth (returned as "already exists").