# 02 — Fix CODING_STANDARDS stale layout and error-code enumeration

**What to build:** A single, self-consistent coding standard. CODING_STANDARDS still names `src/core/` as the domain layer in rules #4, #5, #7 and #11, but the real layout (spec.md §8, ADR-0010, and the actual tree) puts the domain in `src/domain/` — the standard currently contradicts the code and its own #6/#9 which were already corrected. Rule #12 enumerates the AXI error codes but omits `CONTEXT_ERROR`, which the CLI now throws.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] CODING_STANDARDS #4, #5, #7, #11 point at `src/domain/` (and any other stale path they cite), consistent with spec.md §8
- [ ] CODING_STANDARDS #12 lists `CONTEXT_ERROR` alongside VALIDATION_ERROR / NOT_FOUND / PROFILE_ERROR
- [ ] `bun run check` stays green (docs-only change)