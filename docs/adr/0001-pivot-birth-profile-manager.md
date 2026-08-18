# Pivot: birth-profile manager (AXI CLI) — astrology permanently out

lumen v1 was a computational evolutionary-astrology CLI (chart, evo, journey,
karma, draconic, projection, soul…). We decided to **pivot**: lumen v2 is a
**birth-profile manager** — an AXI CLI whose primary consumer is an AI agent —
and all astrology, geocoding and timezone resolution are permanently out of
scope. The rebuild starts from a clean slate: no v1 data migration
(`~/.config/lumen/`), no config store, and a per-project SQLite DB
(`./lumen.db` in the cwd, `LUMEN_DB` override).

## Considered Options

- **Incremental cleanup of v1** (keep the astrology domain, harden the CLI):
  rejected — the v1 feature surface was the problem (astrology features
  accreted unmaintainably), not just its implementation.
- **Pivot to profiles-only, fresh rebuild**: chosen — the smallest product
  that keeps lumen useful as the deterministic interface between the human
  and the agent (validate, derive the Julian Day, persist; never resolve
  world facts).

## Consequences

- ~50 v1 files pruned; the v1 data in `~/.config/lumen/` is not migrated.
- Any future astrological feature is a new product effort, not an extension
  of v2 — the domain vocabulary (chart, evo, karma…) must not creep into the
  v2 model or docs.
- The wayfinder effort charted the pivot and the whole v2 design (see
  `.scratch/lumen-v2/`); this ADR records the irreducible kernel: why the
  project exists in its current shape.