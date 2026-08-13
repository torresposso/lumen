# Spec: Type-safe Chart Extensions

## Problem
In [`src/lib/compute.ts`](file:///home/erick/Projects/clis/lumen/src/lib/compute.ts) and [`src/lib/output.ts`](file:///home/erick/Projects/clis/lumen/src/lib/output.ts), optional chart extensions (eclipses, lots, stars, evolutionary) are attached to `caelus`'s `Chart` type using unsafe `(chart as any)` casts.

## Solution
Define an extended chart type interface (e.g. `ExtendedChart = Chart & { eclipses?: ...; lots?: ...; stars?: ...; evolutionary?: ... }`) or a wrapper struct in `compute.ts`/`output.ts` so that TypeScript types are fully enforced without `any` assertions.
