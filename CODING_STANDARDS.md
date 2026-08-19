# CODING_STANDARDS.md

Coding standards for lumen v2. Consumed by the Standards axis of `/code-review`:
every rule below is a citation target (cite the file + the rule number). Where
this document is silent, `/code-review` falls back to its Fowler smell baseline
(_Refactoring_, ch. 3). Anything tooling already enforces is skipped by reviews
and is not restated here — see [Tooling](#tooling) for the boundary.

## Tooling

Already enforced, not reviewable:

- **Biome** (`bun run check`): tab indentation, double quotes, recommended lint
  preset, import organization.
- **TypeScript** (`bun run typecheck`, strict): `strict`, `verbatimModuleSyntax`,
  `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`.
- **check:docs** (`bun run check`): spec ↔ code parity (spec.md §3 / §8).

## Language & vocabulary

1. **English only in code and docs.** Code identifiers, comments, error and
   output messages, docs and commit messages are written in English. Spanish is
   reserved for human↔agent conversation and never lands in the repo
   (`CONTEXT.md` — Language).
2. **Use the domain vocabulary as-is.** Name things with the exact terms of
   `CONTEXT.md` (birth, birthplace, birthDateTime, birthLat/birthLon,
   birthJdUt, TOON…); do not drift to synonyms. A term that needs resolving is
   a `CONTEXT.md` change in the same commit, not a new word in the code.
3. **lumen never resolves world facts.** No geocoding, timezone/calendar
   lookups, or world-data dependencies in any layer. If a feature needs a world
   fact, the agent supplies it as input; lumen only validates, derives
   (`birthJdUt` via Meeus) and persists (`CONTEXT.md`; ADR-0002).

## Architecture & module shape

4. **Layered layout per spec.md §8.** `bin/` → `src/cli.ts` (wiring) →
   `src/commands/` (orchestration) → `src/domain/` (domain) → `src/storage/`
   (persistence). `src/cli.ts` stays thin: it registers commands and provides
   dependencies through context; commands never construct the store. `main` is
   a thin runner over the declarative, injectable `buildCliOptions`
   (`argv`/`stdout`/store seams), so the whole agent-facing surface is
   testable.
5. **Domain logic lives in `domain/`, persistence in `storage/`.** A command file
   coordinates; it does not compute Julian Days, format output, or talk to the
   DB directly.
6. **One seam per concern.** A contract owns its parsing + validation in one
   place with one error style (`src/cli/args.ts` and `src/domain/birth-input.ts`
   are the models: each accumulates every *checkable* violation and throws one
   error citing all of them). The subcommand runner (`src/cli/subcommand.ts`)
   is the third contract model: it owns the parse → help → dispatch
   choreography a command would otherwise re-type once per subcommand arm.
   Validation must not be re-implemented at call sites — the command owns
   presence and orchestration, never value checks. The birth-input seam
   (`src/domain/birth-input.ts`) is **flag-agnostic**: it receives the flag
   labels from the caller, so the mapping of ergonomic CLI names
   (`--when`/`--where`) onto the model's `birth*` fields happens in the
   command — the domain never imports the CLI vocabulary (`commands → domain`,
   never `domain → cli`). The names themselves live in the command surface
   (`src/cli/surface.ts`): the command and arm tokens, the flag literals, the
   canonical add example, the arm help catalog and the shared hints — plus
   the derived top-level "Commands:" block (`formatCommandsHelp`) and the
   shared empty-state rule (`emptyStateHint`). The **home view** — the profile
   count + empty-state hint a bare invocation publishes — lives in its own
   module (`src/cli/home.ts`, `homeView`): vocabulary vs view is a separate
   concern, so a host that only renders the surface has nothing to do with the
   store. The args spec, usage text, top-level help and birth-input messages
   reference / interpolate the tokens instead of re-typing them, so a
   vocabulary rename is one edit and an added arm is one catalog row
   (ADR-0006; ADR-0007).
7. **Pure kernels don't validate or do I/O.** `src/domain/jd.ts` is arithmetic
   only — no range checks, no imports beyond plain math. Validation belongs to
   the calling contract; I/O belongs to the storage layer.
8. **No speculative generality.** Abstract, parameterize or add hooks only when
   the spec needs it. Keep modules small and deep: a narrow interface hiding
   real behaviour beats broad one.
9. **Storage rules** (`src/storage/profile-store.ts`): the command, the home
   view and the CLI context see only the persistence port `ProfileStore`
   (`src/domain/store.ts` — `list`/`get`/`add`/`remove`); the file adapter
   `SqliteProfileStore` owns the policies: the DB is created **lazily** (only
   `add`); permissions `0600` (repaired on every open); rollback journal (no
   WAL); migrations via `PRAGMA user_version` in one `BEGIN IMMEDIATE` …
   `COMMIT` transaction with a `ROLLBACK` on failure, then a post-migration
   invariant check that the required columns and the `idx_profiles_birth`
   index exist. `add` is the range-guard seam: it rejects out-of-range or
   non-finite `birth*` values as `VALIDATION_ERROR` before any SQL runs.
   Non-`AxiError` SQL failures are wrapped in a `PROFILE_ERROR` (the port
   never leaks a raw driver error); UUID-prefix resolution escapes `%` / `_`
   so a user-supplied id cannot act as a LIKE wildcard. Reads against a
   missing DB return empty / not-found without creating files.
   `InMemoryProfileStore` is the second adapter behind the port — a thin
   wrapper over an injected in-memory `bun:sqlite` `Database` for tests, no
   filesystem side effects. Both adapters share one internal SQL core; neither
   file policy nor lifecycle leaks into the port.

## Data & identity

10. **The birth is the identity.** Dedupe on `birthJdUt + birthLat + birthLon`
    via a `UNIQUE INDEX` + `ON CONFLICT`; `id` is an opaque auto-generated UUID;
    `get`/`delete` accept a UUID only. `name`/`birthPlace` are display metadata
    — never identity, never lookup keys (ADR-0003).
11. **The published output is a policy, not data.** The DB keeps full float64
    precision. The TOON shape an agent parses — which fields, in what order, at
    what precision (`birthJdUt` 6 decimals, `birthLat`/`birthLon` 4) — lives in
    the single display-policy module (`src/domain/toon.ts`, `toonProfile`). No
    other module rounds or shapes output. A moment value is one ISO string
    (`birthDateTime`), echoed verbatim — never split into civil + offset pieces
    (ADR-0004; ADR-0005).

## Errors & output (AXI)

12. **AXI error convention.** Throw `AxiError` with the AXI codes
    (`VALIDATION_ERROR`, `NOT_FOUND`, `PROFILE_ERROR`, `CONTEXT_ERROR`). Input errors cite the
    violated rule; a contract accumulates every checkable violation into the
    error's suggestions so an agent gets the whole verdict in one round-trip.
13. **TOON-only output.** No `--json`. All formatting goes through the TOON
    policy module; output messages are English and parseable by an agent
    (`CONTEXT.md` — TOON).

## Dependencies

14. **Minimal dependencies.** Prefer hand-rolling a small contract over pulling
    a schema/date library (ADR-0002: the ~7-field birth-input contract is
    hand-rolled; no `zod`, no date/time library). A new runtime dependency must
    be justified in the spec and/or an ADR.

## Tests

15. **`bun test`, suites per spec.md §7.** Derived arithmetic is pinned by
    reference vectors; contract detail (formats + semantic ranges) is tested at
    unit level; CLI behaviour (errors, TOON rounding, dedupe) through the CLI.
    `bun run typecheck` and `bun run check` stay green.

## Doc-first

16. **Docs lead, code follows.** `.scratch/<feature>/spec.md` is the contract
    the implementation lands against; `CONTEXT.md` and `docs/adr/` are updated
    in the same change that touches a term or records a decision. A change that
    alters the CLI surface or the file layout lands with its docs in the same
    commit (AGENTS.md — Doc-first rule).

## Override rule

This document **overrides** the `/code-review` smell baseline where they
conflict; where this document is silent, the baseline applies. A rule listed
here is a hard standard; a baseline smell is always a judgement call.
