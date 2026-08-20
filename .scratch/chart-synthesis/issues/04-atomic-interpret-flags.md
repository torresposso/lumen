# Issue 04: Atomic Interpret Flags (`natal`, `transits`, `progressions`)

## Scope

Add `--interpret` flag to:
1. `src/cli/surface.ts` and `src/cli/args.ts` (surface tokens & args parser).
2. Atomic extraction functions:
   - `extractNatalInterpretation(chart: NatalChartOutput): NatalInterpretationOutput`
   - `extractTransitsInterpretation(transits: TransitChartOutput): TransitsInterpretationOutput`
   - `extractProgressionsInterpretation(progressions: ProgressedChartOutput): ProgressionsInterpretationOutput`
3. Wire into `src/commands/chart.ts`.
4. Unit tests covering `--interpret` on all 3 atomic commands.
