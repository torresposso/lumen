# 01 — Close storage hardening test gaps: F2 wrapper on an open store + F3 migration rollback

**What to build:** Proof, not just code, that the two storage guarantees survive hostile conditions. First, the PROFILE_ERROR wrapper must be shown to fire on a store that is *already open* whose backing database is then corrupted — a read or write on it surfaces one PROFILE_ERROR (never a raw SQL driver error). Second, a migration induced to fail mid-way must roll back atomically: the schema version stays at its previous value and no partially-applied columns survive.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] F2 path: open a file-backed store, corrupt the DB behind its back while the store is still open, and assert `list` / `get` / `add` / `remove` each throw AxiError with code PROFILE_ERROR
- [ ] F3 path: craft a pre-v4 database whose migration fails on a late step and assert the transaction rolled back — no partial columns and `user_version` unchanged
- [ ] `bun test tests/storage` and `bun run typecheck` stay green