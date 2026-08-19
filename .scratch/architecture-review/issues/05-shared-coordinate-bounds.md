# 05 — Give the birth-coordinate bounds one home

**What to build:** One set of range bounds for birth coordinates, shared by both validators. The birth-input contract and the store's `add` range guard each enforce latitude ±90, longitude ±180 and finite values with their own inline constants — identical today, but free to drift apart tomorrow. Hoist the bounds to one domain-owned set and import it from both sides.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The lat/lon/finite bounds live in one exported place in the domain layer
- [ ] The birth-input contract and the store's range guard both consume that one source (no inline duplicate remains)
- [ ] `bun test` (contract + storage hardening suites) and `bun run typecheck` stay green