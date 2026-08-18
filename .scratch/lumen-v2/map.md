# Lumen v2 — Map

Effort: redesign of the project from scratch with a pivot to a birth-profile manager (AXI CLI).

## Destination

A **lumen v2** spec ready to implement without further decisions: an AXI CLI for managing birth profiles — `lumen profile add|list|get|rm` over a per-project SQLite DB `./lumen.db`. Input contract: local time + offset (minutes) + lat/lon; lumen computes the Julian Day (pure arithmetic). TOON output, AXI conventions. Astrology (chart, evo, journey, karma, draconic, projection…) stays out of the product.

## Notes

- Domain: birth profiles (id + resolved birth). No astrology.
- Stack: Bun + TypeScript + axi-sdk-js. No caelus / caelus-birth / geocoder / config store (confirmed in ticket 02).
- Primary consumer: an AI agent (AXI CLI). The human talks to the agent; lumen is the deterministic interface: it validates and persists, never resolves world facts.
- Skills per session: grilling + domain-modeling (default); research for 02; prototype for 03 and 04.
- Charting decisions (closed, do not reopen): pivot to profiles only; radical cut (the CLI is also redesigned); no v1 data migration; per-project DB `./lumen.db` in the cwd; input contract "local time + offset"; TOON output; profile commands only.
- Errors/UX: AXI conventions (error codes, actionable suggestions).

## Decisions so far

<!-- the index — one line per closed ticket: enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [Data model of the v2 profile](issues/01-data-model.md) — profile = {auto UUID, optional name without lookup, birth: input (local without seconds + offset + lat/lon) + jdUt derived by Meeus}; no status/zone/dst; `add` deduplicates on the birth (jdUt + coords); validation from research 02 (offset ±840, year 1800–2100, day by pure arithmetic).
- [Julian Day calculation and dependency tree](issues/02-jd-calculation-and-deps.md) — jdUt via Meeus ch. 7 in pure arithmetic (bit-identical to caelus, 14/14 vectors); hand-rolled validation; final deps: `axi-sdk-js` + dev/peer; `caelus`, `caelus-birth`, `zod` and `luxon` removed.
- [SQLite schema and DB file](issues/03-schema-and-db-file.md) — flat columns (+ `city` NOT NULL, amendment from 04); dedupe via UNIQUE INDEX (jd_ut, lat, lon) with ON CONFLICT; lazy creation only on `add`; `LUMEN_DB` override; v1 conventions (0600, rollback journal, user_version=1).
- [CLI surface v2](issues/04-cli-surface.md) — `add` with `--when --offset --at --city --name` (city required and human-readable, name optional); `get`/`rm` by UUID; TOON-only output (jdUt 6, lat/lon 4 — display only); English messages; AXI errors (VALIDATION_ERROR / NOT_FOUND / PROFILE_ERROR).
- [v2 test strategy](issues/05-tests.md) — three suites on `bun test` (jd: 14 vectors + validations; profile-store: CRUD/dedupe/lazy/permissions/migration; cli: contract/errors/TOON/UUID); v1: rewrite profile-store + cli, discard the rest.

---

**🏁 Effort closed (2026-08-18):** destination reached — all 5 decisions closed, the way clear, hand-off spec at [`spec.md`](spec.md) — **and the rebuild executed and shipped**. The implementation is live on `main` (commits `c491ae3` feat, `a81f964` code-review fixes, `006f5d4` i18n), pushed to `origin/main`. `bun test` 51 pass / 0 fail; `bun run check` green. No tickets or fog remain.

## Not yet specified

*(Empty — all fog graduated into closed tickets; effort closed 2026-08-18.)*

## Out of scope

- **All astrology** — charts, reading, evo-criteria, evolutionary-reading, journey, karma, projection, soul, classical, nodes, phases, ephemeris-gateway, and their associated ADRs/decisions (precision, draconic, etc.). Pivot confirmed: they do not return.
- Geocoding (Open-Meteo) and timezone resolution — the agent resolves them.
- v1 data migration (`~/.config/lumen/lumen.db`) — start clean.
- v1 config store (chart options) and non-profile commands (`setup`, `chart`, `journey`, `karma`, `intake`).
- ~~The implementation of the rebuild~~ — the map decides; a separate effort executes (the `spec.md` is the hand-off). **Executed 2026-08-18** (`c491ae3`, `a81f964`, `006f5d4`) — closed, see the effort-close note above.
