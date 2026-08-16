## Agent skills

### Issue tracker

Issues live as local markdown files under `.scratch/<feature>/` in this repo. See `docs/agents/issue-tracker.md`.

**Doc-first (antes de implementar, los docs se actualizan):** toda feature abre
con un ticket `01-docs-*` que reescribe README/DOMAIN/SPEC/CONTEXT/domain.md al
target y bloquea a los tickets de implementación. La paridad docs↔código es
mecánica (`bun run check:docs` dentro de `bun run check`): si SPEC §3 o el
árbol de DOMAIN.md/domain.md divergen de `src/`, falla. Nunca editar código
contra docs desactualizados.

### Triage labels

Default label vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
