# Issue 01: Eliminate unsafe `(chart as any)` casts in compute and output modules

Status: resolved

## Description
In `src/lib/compute.ts` and `src/lib/output.ts`, optional modules (`eclipses`, `lots`, `stars`, `evolutionary`) attach extra properties to the `Chart` instance by casting `(chart as any)`.

### Target Locations
- [`compute.ts:L129`](file:///home/erick/Projects/clis/lumen/src/lib/compute.ts#L129) `(chart as any).eclipses = ...`
- [`compute.ts:L157`](file:///home/erick/Projects/clis/lumen/src/lib/compute.ts#L157) `(chart as any).lots = ...`
- [`compute.ts:L186`](file:///home/erick/Projects/clis/lumen/src/lib/compute.ts#L186) `(chart as any).stars = ...`
- [`compute.ts:L298`](file:///home/erick/Projects/clis/lumen/src/lib/compute.ts#L298) `(chart as any).evolutionary = ...`
- [`output.ts:L91-L94`](file:///home/erick/Projects/clis/lumen/src/lib/output.ts#L91-L94) `(chart as any).<extension>`

## Goal
Replace `(chart as any)` with strongly typed interfaces (e.g. extending `Chart` or defining a clean domain return type in `compute.ts`) so TypeScript strictly checks extensions end-to-end.

## Answer
Resolved by introducing `LumenChart` interface in `src/lib/compute.ts` (extending `caelus.Chart` with optional typed `eclipses`, `lots`, `stars`, and `evolutionary` results). Updated `output.ts` to consume `LumenChart` without `any` casts.

## Comments
- `(chart as any)` casts completely removed from `compute.ts` and `output.ts`.
- `getHouseOf` deduplicated in `compute.ts`.
