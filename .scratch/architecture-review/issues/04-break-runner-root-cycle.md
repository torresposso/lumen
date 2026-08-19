# 04 — Break the subcommand-runner ↔ composition-root module cycle

**What to build:** A generic AXI subcommand runner that does not depend on the composition root. Collapsing the CLI context into the root left the runner importing the root's `requireCliContext` purely for its throw side-effect (plus a type cast), creating a cli.root ⇄ cli.runner module cycle through the command modules. The runner's missing-context guard should throw the same CONTEXT_ERROR it does today, but defined locally, so no value import crosses the root.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Running a subcommand with no context still fails loud with code CONTEXT_ERROR and the same suggestion
- [ ] The runner module imports nothing by value from the composition root; the root⇄runner cycle is gone
- [ ] `requireCliContext` remains in the root for the home handler (its behaviour unchanged)
- [ ] Existing CONTEXT_ERROR assertions in the CLI tests pass; `bun test` and `bun run check` stay green