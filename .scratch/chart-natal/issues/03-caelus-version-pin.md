# 03 — caelus-version-pin

Type: grilling
Status: resolved

## Question

Which caelus version does the port pin — v1's floor `0.23.0` (known-good for the ported code) or the current `0.24.1`?

Grill with 01's evidence:

- Cost of upgrading to `0.24.1`: which breaking changes touch the ported adapter / charts code.
- Cost of staying on `0.23.0`: maintenance state, and whether `porphyry` houses are available and identical on both (the port depends on them).
- Reproducibility: exact pin (`0.24.1`) vs range — the vector tests in 06 need a deterministic engine.

Close this ticket when the pin is decided and written down.

## Context

- Evidence: 01 (caelus-delta-research) — its findings and links.
- v1 used `^0.23.0`; the port adapts from that floor.
- Output structure (02) is independent of version; layout (04) and vectors (06) depend on the pin.

## Answer

Resolved by decision (2026-08-18):
- **Pin exact version `0.24.1`** in `package.json` (`"caelus": "0.24.1"`).
- Exact pin ensures deterministic calculations across vector suites (Ticket 06).
- Adopts latest astronomical precision fixes for Pluto/Chiron aberration and precession, avoids deprecated `0.24.0`.

