# lumen

lumen v2 — a birth-profile manager (AXI CLI).

lumen is an **AXI CLI**: its primary consumer is an AI agent. The human talks to
the agent and gives the birthplace and the local birth date and time; the
agent resolves coordinates and the UTC offset and calls lumen. lumen validates,
computes the Julian Day (Meeus, pure arithmetic) and persists the profile.

## Install dependencies

```bash
bun install
```

## Usage

```bash
# Register a birth profile (local date/time + UTC offset in one ISO --when, plus coordinates)
bun run bin/lumen.ts profile add --when "1981-01-26T00:50-05:00" --at "9.15,-74.75" --birthplace "Magangué, Colombia" --name silvia

# List, view and delete
bun run bin/lumen.ts profile list
bun run bin/lumen.ts profile get <uuid>
bun run bin/lumen.ts profile delete <uuid>
```

- `add` **deduplicates on the birth**: the same jdUt + coordinates returns the
  existing profile.
- `--when` is an **ISO 8601 datetime with an explicit UTC offset**
  (`YYYY-MM-DDTHH:MM±HH:MM` or `…Z`) — the agent resolves the offset from the
  place and formats it into `--when`; there is no separate `--offset` flag.
- IDs are **auto-generated UUIDs**; `get`/`delete` accept a UUID only.
- Messages and errors are in English; output is **TOON** (Token-Oriented Object
  Notation) with the lumen precision policy (jdUt at 6 decimals, lat/lon at 4,
  `when` echoed as stored).

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