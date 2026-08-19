# 03 — Remove the surface↔home compat shim

**What to build:** One home for the home view. The surface module kept a compatibility re-export of `homeView` so the existing test kept working after the vocabulary/view split; that re-export makes the surface module import from the view module (and the view module already imports the surface), forming a two-file cycle whose only purpose is the transition. Point the test at the real module and delete the shim.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The home-view tests import `homeView` from its real module, not through the surface
- [ ] The surface module no longer re-exports `homeView` and its transition comment is gone
- [ ] No module cycle remains between the surface and the view; `bun test` and `bun run check` stay green