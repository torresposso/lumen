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