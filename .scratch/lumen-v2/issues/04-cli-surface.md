# 04 — CLI surface v2

Type: prototype
Status: resolved
Blocked by: 01

## Question

What does the `lumen profile add|list|get|rm` surface look like exactly?

- Flags and the `add` input contract (per 01), arguments of `list`/`get`/`rm`.
- TOON output: number-format policy and layout per command; `--json` for the agent (with TOON rounding applied)?
- AXI messages and errors: codes, actionable suggestions, language (Spanish or English?).
- Prototype: example session of the 4 commands (input/output).

## Answer

Resolved (2026-08-18). Prototype approved with adjustments.

**Surface**: `lumen profile add|list|get|rm`.

**`add` contract** (compact strings):
- `--when "YYYY-MM-DDTHH:MM"` — local date/time (no seconds), validated per 01/02.
- `--offset ±N` — UTC offset in minutes (integer, −840..+840).
- `--at "lat,lon"` — coordinates (lat −90..90, lon −180..180).
- `--city "<human-readable place>"` — **required** (e.g. `"Madrid, Spain"`); the human always provides city + country, the agent resolves lat/lon/offset and the place is stored as-is.
- `--name <slug>` — optional, descriptive (no lookup).
- The `add` output includes the **generated UUID** (the agent tracks it for `get`/`rm`).

**`get`/`rm`**: by UUID only (no lookup by name or city — decision 01).

**Output**: **TOON only** (no `--json`); the agent parses the text. Centralized TOON policy in `toon.ts`: `jdUt` at 6 decimals, `lat`/`lon` at 4, `offset` as an integer in minutes — display only; the DB keeps full precision.

**Language**: English (as v1).

**AXI errors**: `VALIDATION_ERROR` (invalid input, citing the violated rule), `NOT_FOUND` (`get`/`rm` of an unknown UUID), `PROFILE_ERROR` (store failure, e.g. unwritable cwd).