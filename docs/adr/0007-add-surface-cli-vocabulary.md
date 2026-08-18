# ADR-0007 — the add surface owns the ergonomic CLI vocabulary

ADR-0006 chose ergonomic `--when`/`--where` flags mapped onto the flat `birth*`
model at the single birth-input seam, and promised that a future flag rename
would touch only that seam. In practice the literals were re-typed by hand in
three places — the command's `ArgsSpec`, its usage text, and the birth-input
contract's error messages — plus the canonical example. The sprint's renames
(`--city` → `--birthplace`, four `--birth…` flags → two, the `--offset` fold)
each rippled through every module, the docs and the test suites. The promise
and the code disagreed.

We decided: the ergonomic `profile add` vocabulary gets one home. The **add
surface** (`src/core/cli-surface.ts`) exports the flag literals
(`--when` / `--where` / `--name`) and the canonical add example. The command's
args spec, its usage text and the birth-input contract's messages reference
the tokens; none re-types a literal. A flag rename is a single edit in one
module.

## Considered Options

- **Keep the names where they are (status quo)**: rejected — the vocabulary
  was already spread across the command module, the usage text and the
  birth-input messages; the promise in ADR-0006 had no mechanism.
- **Export the names from `birth-input.ts`**: rejected — the value-semantics
  contract would start feeding the syntax spec, inverting the args ↔
  birth-input layering for no gain.
- **Keep them in the command module**: rejected — ADR-0006 deliberately
  disowns the ergonomic names from the command.

## Consequences

- A flag rename updates `src/core/cli-surface.ts` and nothing else re-types
  it: the args spec, the usage text and the birth-input messages interpolate
  the tokens.
- ADR-0005 and ADR-0006 stand: model, DB and TOON keep the flat `birth*`
  vocabulary; the add surface holds the *names*, the birth-input contract
  holds the *meanings*.
- `RawBirthInput` keeps its `when` / `where` property identifiers — they are
  the contract's field names, not CLI strings, and never follow a flag rename.

## Update (2026-08-18)

The add surface is widened to the **command surface**. It now also owns the
command token (`lumen profile`), the four arm command-lines and the shared
empty-state / NOT_FOUND hints; the top-level help in `src/cli.ts` and the
`get`/`delete` arm usage interpolate them, so a command or arm rename is one
edit too — the promise this ADR made for flags now holds for the whole agent
facing vocabulary. In the same pass the profile store's migration suggestion
stopped citing a CLI command: persistence keeps no reference to the CLI
surface (ADR-0006). The `CONTEXT.md` term is now *command surface*; the
add-slice scope recorded above is subsumed.

## Update (2026-08-18, architecture review)

The surface now also owns the **arm help catalog** (per-arm one-liners) and
derives the top-level "Commands:" block (`profileCommandsHelp`) from it, so
`src/cli.ts` stops re-typing the arm lines — adding an arm is one catalog
row, not an edit in the root wiring. The **home view** (`homeView`: the
profile count + the empty-state hint a bare invocation publishes) lives here
too, beside the rule that selects the hint; the root calls the seam instead
of re-composing the empty-state decision. The promise this ADR made for
renames now also holds for *additions* and for *rendering*.