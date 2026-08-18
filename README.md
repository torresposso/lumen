# lumen

lumen v2 — a birth-profile manager (AXI CLI).

lumen is an **AXI CLI**: its primary consumer is an AI agent. The human talks to
the agent and gives the city/country and the local birth date and time; the
agent resolves coordinates and the UTC offset and calls lumen. lumen validates,
computes the Julian Day (Meeus, pure arithmetic) and persists the profile.

## Install dependencies

```bash
bun install
```

## Usage

```bash
# Register a birth profile (local time + UTC offset + coordinates + city)
bun run bin/lumen.ts profile add --when "1981-01-26T00:50" --offset 60 --at "9.15,-74.75" --city "Magangué, Colombia" --name silvia

# List, view and remove
bun run bin/lumen.ts profile list
bun run bin/lumen.ts profile get <uuid>
bun run bin/lumen.ts profile rm <uuid>
```

- `add` **deduplicates on the birth**: the same jdUt + coordinates returns the
  existing profile.
- IDs are **auto-generated UUIDs**; `get`/`rm` accept a UUID only.
- Messages and errors are in English; output is **TOON** (Token-Oriented Object
  Notation) with the lumen precision policy (jdUt at 6 decimals, lat/lon at 4).

## Persistence

- The DB lives at `./lumen.db` in the working directory (per-project), or at
  the path of `LUMEN_DB` when set.
- It is created **lazily**: only `add` creates the file.
- `0600` permissions, rollback journal (no WAL), migrations via
  `PRAGMA user_version`.
- `lumen.db` is in `.gitignore` (it is per-project data).

## Dependencies

- Runtime: `axi-sdk-js` (AXI framework + error convention).
- Dev: `@biomejs/biome`, `@types/bun`; peer: `typescript`.

## Development

```bash
bun run typecheck
bun run check
bun test
bun run build
```