# AGENTS.md

## Agent skills

### Issue tracker

Issues and specs live as markdown files under `.scratch/<feature>/` in this repo. See `docs/agents/issue-tracker.md`.

### Triage labels

Default labels: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: a root `CONTEXT.md` plus `docs/adr/`. See `docs/agents/domain.md`.

## Workflow

### Doc-first rule

Documentation is updated **before** code is implemented, never after:

- `.scratch/<feature>/spec.md` is the contract the implementation lands
  against — a feature is RED (not implemented) until its spec describes the
  target first.
- `CONTEXT.md` and `docs/adr/` are updated in the same change when the work
  touches a domain term or records a decision (terms crystallise at the
  moment they are resolved — see `docs/agents/domain.md`).
- `bun run check:docs` (`scripts/check-docs.ts`) enforces the parity: the
  spec surface (§3) and the src tree (§8) must match the real code. A change
  that alters the CLI surface or the file layout stays RED until its docs
  land first — that is the intended order, not a bug to skip.
- Commit messages describe the change in English, and any freshly resolved
  term or decision is captured in the same commit.