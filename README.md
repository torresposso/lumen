# lumen

lumen v2 — a birth-profile manager and deterministic astrological chart engine (AXI CLI).

lumen is an **AXI CLI**: its primary consumer is an AI agent. The human talks to
the agent and gives the birthplace and the local birth date and time; the
agent resolves coordinates and the UTC offset and calls lumen. lumen validates,
derives the Julian Day (Meeus, pure arithmetic), persists the profile, and
calculates exact natal chart geometry and evolutionary mechanics (JWGEA canon)
using embedded ephemerides (`caelus: 0.24.1`).

## Install dependencies

```bash
bun install
```

## Usage

```bash
# Register a birth profile (ISO moment with UTC offset + coordinates/place)
bun run bin/lumen.ts profile add --when "1981-01-26T00:50-05:00" --where "9.15, -74.75, Magangué, Colombia" --name silvia

# List, view and delete
bun run bin/lumen.ts profile list
bun run bin/lumen.ts profile get <uuid>
bun run bin/lumen.ts profile delete <uuid>

# Calculate natal chart (Porphyry houses, True Node, JWGEA evolutionary mechanics)
bun run bin/lumen.ts chart natal <uuid>
```

- `add` **deduplicates on the birth**: the same birthJdUt + coordinates returns
  the existing profile.
- `--when` is an **ISO 8601 datetime with an explicit UTC offset**
  (`YYYY-MM-DDTHH:MM±HH:MM` or `…Z`) — the agent resolves the offset from the
  place and formats it into `--when`. `--where "lat, lon, Place"` bundles the
  coordinates and the place (the first two comma-separated parts are lat/lon,
  the rest is the place).
- IDs are **auto-generated UUIDs**; `get`, `delete`, and `chart natal` accept a UUID only.
- `chart natal` computes pure natal chart geometry and evolutionary mechanics
  (Pluto polarity, nodal axis, skipped steps, dispositor chains, soul lots,
  prenatal eclipses, aspect patterns, out-of-bounds status, and shadow antiscia)
  over the stored profile's `birthJdUt` and coordinates without resolving external world facts.
- Messages and errors are in English; output is **TOON** (Token-Oriented Object
  Notation) with the lumen precision policy (`birthJdUt` at 6 decimals,
  `birthLat`/`birthLon` at 4, `birthDateTime` echoed as stored).

## Persistence

- The DB lives at `./lumen.db` in the working directory (per-project), or at
  the path of `LUMEN_DB` when set.
- It is created **lazily**: only `add` creates the file.
- `0600` permissions, rollback journal (no WAL), migrations via
  `PRAGMA user_version`.
- `lumen.db` is in `.gitignore` (it is per-project data).

## Dependencies

- Runtime: `axi-sdk-js` (AXI framework + error convention), `caelus` (embedded ephemerides & astronomical math).
- Dev: `@biomejs/biome`, `@types/bun`; peer: `typescript`.

## Development

```bash
bun run typecheck
bun run check
bun test
bun run build
```