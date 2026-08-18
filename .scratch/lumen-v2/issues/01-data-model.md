# 01 — Data model of the v2 profile

Type: grilling
Status: resolved

## Question

What exactly is a profile in lumen v2?

- Birth fields: jdUt, lat, lon, local (date/time), offsetMinutes, status… — which are persisted and which are derived?
- Shape and validation of the id (agent-supplied slug, as today: `erik`).
- Validated `profile add` input contract: local time + offset (minutes) + lat/lon; ranges and rules (offset ±840′, valid dates).
- No metadata (charting decision). The jdUt computation is fixed in 02; here we decide which fields exist.

Close this ticket when the data model and the input contract are written down without ambiguity.

## Answer

Resolved in grilling (2026-08-18).

**Profile v2**
- `id`: **auto-generated UUID** by lumen (unique, opaque). No agent-supplied slug.
- `name?`: optional, **descriptive, no uniqueness or lookup** (display only).
- `city`: **required**, descriptive — human-readable place (e.g. `"Madrid, Spain"`), provided by the agent and stored as-is. *(Amendment resolved in 04: the human always provides city + country; the agent resolves lat/lon/offset from it.)*
- `birth`:
  - **Original input persisted**: `local {year, month, day, hour, minute}` (no seconds), `offsetMinutes`, `lat`, `lon`.
  - **`jdUt`**: canonical derived value, computed by lumen (Meeus formula — ticket 02).
- **No `status` / `zone` / `dst`**: removed from the model (meaningless without timezone resolution).

**`profile add` input contract** (local time + offset + lat/lon)
- Validation adopted from research 02: offset −840..+840; year 1800–2100; month 1–12; day valid by pure arithmetic (Gregorian leap rule); hour 0–23; minute 0–59; lat −90..90; lon −180..180. No seconds.
- **`add` semantics**: deduplicates on the birth — if a profile with the same resolved birth (same jdUt + coords) exists, it is returned. Consequence: the `name`/`city` of the second `add` are discarded (the birth is the identity).
- No upsert by id (the UUID is auto-generated); each new birth creates a new profile.