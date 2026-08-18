# Profile identity is the birth — dedupe on jdUt + lat + lon

The natural reading of a "profile" is a person record keyed by an id or a
name, which invites upsert-by-id or lookup-by-name. We decided the opposite:
**the birth is the identity**. A profile is its resolved birth instant
(`jdUt + lat + lon`); `add` deduplicates on it via
`CREATE UNIQUE INDEX (jd_ut, lat, lon)` + `INSERT … ON CONFLICT`, returning
the existing profile (the second `add`'s `name`/`birthplace` are discarded). The
`id` is an auto-generated opaque UUID, and `get`/`rm` accept a UUID only —
there is no lookup by name or birthplace anywhere.

## Considered Options

- Agent-supplied slug id (v1 style, e.g. `erik`) with upsert: rejected —
  slugs invite collisions, renames and "id as description" confusion.
- Allow duplicate profiles: rejected — two profiles for the same birth would
  make `rm` ambiguous and rot the data set silently.

## Consequences

- `add` of an already-known birth is effectively idempotent: the caller gets
  the canonical profile back, so agents can re-add safely without a `get`
  pre-flight.
- The `name`/`birthplace` fields are display metadata only — never identity,
  never a lookup key. This is why the model carries them off the uniqueness path
  (they are discarded on conflict). The CLI flag for the birthplace is
  `--city` (surface only); the model field and the stored column are
  `birthplace` (ADR-0002 notes the 2026-08-18 rename, schema v1 → v2).