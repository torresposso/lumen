# 07 — Decide the birth-input default labels (rename promise)

**What to build:** A decision, implemented, about where the `--when`/`--where` literals may live. ADR-0007 and CODING_STANDARDS #6 promise "a flag rename is one edit in the surface", but the birth-input contract ships default labels that re-type the same literals in the domain layer — the promise is currently two edits unless every caller passes labels. Choose one resolution and land it:

- **(a) Required labels** — `parseBirthInput` receives labels at every call site (the add arm already passes them); domain tests updated; a rename is exactly one surface edit, the promise holds exactly.
- **(b) Documented exception** — keep the defaults, update ADR-0007 / CONTEXT / CODING_STANDARDS #6 to state the two-edit reality for the domain-default path.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] One of (a) or (b) is chosen and landed (chosen: (a) Required labels — `parseBirthInput` requires `labels: BirthInputLabels`, no domain default fallback)
- [x] The docs that promise the single-edit rename state the true behaviour (strictly true after (a), ADR-0007 updated)
- [x] `bun test` and `bun run check` stay green