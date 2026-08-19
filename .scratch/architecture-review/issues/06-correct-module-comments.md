# 06 — Correct misleading engine/storage comments

**What to build:** Documentation honesty at the module level. The aspects module header claims only two symbols are part of the engine's test surface while the module also carries an "exported for tests" marker on a constant that no test imports (natal.ts consumes it) — the header and the markers should agree. The store's `open()` doc claims "Only writes call this", but reads also open the database to repair file permissions — the doc should match F1 behaviour.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] The aspects header and each "exported for tests" marker agree on exactly which exports are test surface
- [x] The store's `open()` documentation describes the read-repairs-permissions behaviour (no "only writes" claim)
- [x] Comment-only change: `bun test` and `bun run typecheck` stay green