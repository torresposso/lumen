# Research 02 — Julian Day with pure arithmetic and the dependency tree

Ticket: `.scratch/lumen-v2/issues/02-jd-calculation-and-deps.md`
Branch: `research/calculo-jd-y-deps`
Date: 2026-08-18
Method: verification by execution (`bun`) of candidate formulas against known reference JD values and against the `julianDay` implementation of caelus installed in `node_modules` (repo primary source).

---

## Recommendation (summary)

1. **Formula:** the algorithm of **chapter 7 of Meeus, "Astronomical Algorithms" (2nd ed., 1998)** — *"Julian Day"* — applied to the fractional UT day derived from `local time + offset`:

   ```
   utDay = day + (hour + minute/60 + second/3600 − offsetMinutes/60) / 24
   if month ≤ 2: y = year − 1, m = month + 12   (otherwise: y = year, m = month)
   A = floor(y / 100)
   B = 2 − A + floor(A / 4)
   JD = floor(365.25 × (y + 4716)) + floor(30.6001 × (m + 1)) + utDay + B − 1524.5
   ```

   This is **exactly the arithmetic caelus already uses** (`julianDay` in `node_modules/caelus/dist/src/core.js`, lines 43–53): lumen v2 computes the *same* `jdUt` as v1 for the same UT instant, without caelus-birth. It is numerically equivalent to **Fliegel–Van Flandern (1968, CACM 11(10):657)** across the whole verified range (bit-for-bit over 1800–2100). Meeus is chosen because it is the canonical astronomical source, it is what caelus uses (continuity verifiable against caelus in tests), and the implementation is directly auditable against the book.

2. **Final dependencies:** remove `caelus`, `caelus-birth` and `zod` (the last to be confirmed after ticket 01). Remain: `axi-sdk-js` (runtime dep) + `@types/bun`, `@biomejs/biome`, `typescript` (dev/peer).

3. **Verification:** 14/14 reference vectors PASS for both Meeus and F&VF; 0 mismatches against caelus's `julianDay` over 1800–2100 (3 samples/month); local+offset→UT round-trip identical to caelus (0 failures).

---

## 1. Recommended formula and why

### Candidates evaluated

| Formula | Source | Verdict |
|---|---|---|
| **Meeus ch. 7** (365.25/30.6001/1524.5) | *Astronomical Algorithms*, 2nd ed., 1998, ch. 7 | **RECOMMENDED** |
| Fliegel–Van Flandern (153m+2 / 365y / 32045) | CACM 11(10):657, 1968 | Equivalent; adds nothing in JS (float64) |
| `julianDay` from caelus | `node_modules/caelus/dist/src/core.js` | Is Meeus ch. 7, implemented verbatim |

### Why Meeus ch. 7

- **It is what caelus already does.** `caelus-birth` delegates the whole computation to `julianDay(year, month, day, hour, minute, second)` from caelus ([`node_modules/caelus-birth/dist/src/index.js`](node_modules/caelus-birth/dist/src/index.js), `toJdUt` → `julianDay`), and that function is Meeus ch. 7 verbatim ([`node_modules/caelus/dist/src/core.js`](node_modules/caelus/dist/src/core.js), lines 43–53). lumen v2, by replacing zone resolution with a direct offset, produces **numerically identical jdUt values** to v1: regression tests can compare against caelus.
- **Equivalent to F&VF, but with better provenance.** Verified bit-for-bit (Δ = 0) against F&VF on the 14 vectors and on 3,096 samples over 1800–2100. F&VF is an integer formula designed for C/assembly; in JS float64 there is no practical difference. The canonical astronomical source is Meeus.
- **Safe range and precision.** For 1800–2100, `365.25×(y+4716)` ≤ ~2.49×10⁶ and `30.6001×(m+1)` ≤ 428.4: both are exactly representable in float64, the `floor` is safe (Δ = 0 vs caelus over the whole range). Minute-granular input and float64 jdUt output accumulate no appreciable error (precision ~10⁻⁶ day = 0.09 s at 2.4×10⁶).

### Proleptic calendar (what the formula does before 1582)

- The formula applies Gregorian leap rules to **all** dates (the `B` term depends only on the century, not the date): it is **proleptic Gregorian**.
- Before 15-10-1582 the historical calendar was Julian, so a historical Julian date maps to a different JD. Example verified: **1582-10-04 (Julian) = 1582-10-14 (proleptic Gregorian) = JD 2299159.5**, while 1582-10-04 (proleptic Gregorian) = JD 2299149.5. The series 1582-10-05…14 does not exist in the real Gregorian calendar (the 10-day reform gap).
- **lumen does not need it:** realistic birth dates are 1800–2100, entirely Gregorian. See §3 for the recommended validation rule.

### Fractional day

```
UT (hours) = hour + minute/60 + second/3600 − offsetMinutes/60
utDay      = day + UT/24          # integer part = Gregorian day, fraction = UT time of day
```

JD 0 = noon of 1-1-4713 BC (proleptic Julian); the `−1524.5` places midnight at a JD ending in `.5` (e.g. 2000-01-01 00:00 UT = 2451544.5). Positive offsets (east) subtract hours from local time; negative (west) add them.

---

## 2. Verified test vectors (14/14 PASS)

Executed with `bun` (v1.3.14) — both formulas (Meeus and F&VF) on each vector; tolerance 1e-9. Additionally: **0 mismatches** against caelus's `julianDay` over 1800–2100 (3 samples/month) and **0 failures** on local+offset → UT fields → caelus round-trips.

| # | Input (local y/m/d h:m:s, offset min) | Expected JD | Computed | Result |
|---|---|---|---|---|
| 1 | 2000-01-01 12:00:00, offset 0 | 2451545.0 | 2451545.0 | PASS |
| 2 | 1900-01-01 00:00:00, offset 0 | 2415020.5 | 2415020.5 | PASS |
| 3 | 1999-01-01 00:00:00, offset 0 | 2451179.5 | 2451179.5 | PASS |
| 4 | 1957-10-04 19:26:00, offset 0 (Meeus 7.a, Sputnik) | 2436116.31 (printed; exact 2436116.30972) | 2436116.3097222224 | PASS |
| 5 | 1987-01-27 00:00:00, offset 0 (Meeus 7.b) | 2446822.5 | 2446822.5 | PASS |
| 6 | 1582-10-04 00:00:00, offset 0 (proleptic Gregorian) | 2299149.5 | 2299149.5 | PASS |
| 7 | 1582-10-14 00:00:00, offset 0 (= Julian 1582-10-04) | 2299159.5 | 2299159.5 | PASS |
| 8 | 1582-10-15 00:00:00, offset 0 (proleptic Gregorian) | 2299160.5 | 2299160.5 | PASS |
| 9 | **Negative offset:** 2000-01-01 07:00:00, offset **−300** (= 12:00 UT) | 2451545.0 | 2451545.0 | PASS |
| 10 | **Positive offset crossing midnight:** 2000-01-01 00:00:00, offset **+570** (= 1999-12-31 14:30 UT) | 2451544.1041666665 | 2451544.1041666665 | PASS |
| 11 | **Non-integer fraction:** 2000-01-01 00:00:00, offset **+330** (= 1999-12-31 18:30 UT) | 2451544.2708333335 | 2451544.2708333335 | PASS |
| 12 | **Seconds:** 2000-01-01 12:00:01, offset 0 | 2451545.0000115741 | 2451545.000011574 | PASS |
| 13 | **Limit offset:** 2000-01-01 12:00:00, offset **+840** (= 1999-12-31 22:00 UT) | 2451544.4166666665 | 2451544.4166666665 | PASS |
| 14 | **Limit offset:** 2000-01-01 12:00:00, offset **−840** (= 2000-01-02 02:00 UT) | 2451545.5833333335 | 2451545.5833333335 | PASS |

Additional cross-checks (executed, all PASS):
- Meeus vs F&VF vs caelus's `julianDay`, 1800–2100, days {1,15,28} × 12 months × 301 years = **3,096 samples**: 0 mismatches, max Δ = 0.
- Round-trip: `jdMeeus(local, offset)` == `julianDay(caelus, utFields)` with `utFields = local − offset/60/24` for offsets {−840, −300, 0, 330, 570, 840} × 3 dates: 0 failures.

Verification script: `/tmp/opencode/jd-verify.ts` (outside the repo; reproducible with `bun /tmp/opencode/jd-verify.ts`).

---

## 3. Recommended validation rules for the input contract

Verified facts that motivate the rules:
- The formula is garbage-in-garbage-out: **30 February 2000 produces the same JD as 1 March 2000** (2451604.5), and **29 February 1900 (not a leap year) produces the same JD as 1 March 1900** (2415079.5). Invalid dates must be rejected before computing.
- `hour = 24` silently collapses to the next day 00:00 (identical JD): the upper bound for hour must be 23.
- The current days-per-month check in `src/commands/intake.ts` (line 53) uses `new Date(Date.UTC(year, month, 0))`, and **Date.UTC maps years 0–99 onto the 20th century** (verified: `Date.UTC(50,…)` → 1950). A leap validation by pure arithmetic avoids that footgun.

Concrete recommended rules:

| Field | Rule | Suggested error |
|---|---|---|
| `offsetMinutes` | integer, **−840 ≤ offset ≤ +840** (the real historical maximum range is UTC−12 to UTC+14; it matches the ±14 h caelus-birth already bounds in its `toUT` comment) | `--offset must be between -840 and +840 minutes` |
| `year` | integer in **[1800, 2100]** (realistic birth-date range; keeps the Gregorian calendar unambiguous proleptically) | `--year out of supported range 1800-2100` |
| `month` | integer 1–12 | `--month must be 1-12` |
| `day` | integer 1–`daysInMonth(year, month)` with the Gregorian leap rule (`y%4==0 && (y%100!=0 \|\| y%400==0)`), pure arithmetic | `--day invalid for that month` |
| `hour` | integer 0–23 (not 24) | `--hour must be 0-23` |
| `minute` | integer 0–59 | `--minute must be 0-59` |
| `second` | 0–59 if the contract includes it (the v1 schema has no seconds) | — |
| `lat` / `lon` | −90…90 / −180…180 | `--lat must be -90 to 90` |

Notes:
- **Leap seconds: ignore, documented.** JD counts continuous days; leap seconds (27 since 1972, the last on 2016-12-31) are discrete insertions that make UTC non-uniform versus TAI/UT1. lumen input arrives in **minutes** (it cannot even express a leap second), the offset is in whole minutes, and a ≤1 s discrepancy is ~1.2×10⁻⁵ day, irrelevant for an astronomical/astrological jdUt. The formula is the standard one for continuous "UT"; there is nothing to do.
- **DST (ambiguity/nonexistence):** disappears by construction. With an explicit offset there is no zone resolution and no transitions; the `status` (ok/ambiguous/nonexistent), `zone` and `dst` fields of `ResolvedBirth` (v1, originating from `UTResult` of caelus-birth) stop making sense — ticket 01 decides whether they survive. Recommendation: they do not persist; `jdUt` is derived and the input offset is stored.

---

## 4. Dependency tree

### Current import map (grep over `src/`)

| Package | Imported today at | In the v2 cut (profile add/list/get/rm)? |
|---|---|---|
| `axi-sdk-js` | `cli.ts` (`runAxiCli`), `commands/*` (`AxiCliCommand`, `AxiError`), `storage/profile-store.ts` (`AxiError`) | **YES — keep.** It is the AXI framework + error/UX convention. |
| `caelus` | `storage/config.ts`, `adapters/ephemeris-gateway.ts`, `core/types.ts`, `core/{nodes,karma,charts,journey,projection,classical,evolutionary-reading}.ts`, `commands/{intake,journey}.ts` | **NO — remove.** Everything importing it is astrology or v1 intake (out of scope). The needed `julianDay` is reimplemented with Meeus (§1). |
| `caelus-birth` | `core/birth.ts` (`toUT`), `core/types.ts` (type `UTResult` → `BirthStatus`), `adapters/geocode.ts` (`openMeteoGeocoder` from `caelus-birth/geocode`) | **NO — remove.** Its only function in the cut was `toUT` (zone→offset→JD); v2 replaces it with an explicit offset + Meeus. The geocoder leaves too (the agent resolves it — charting decision). |
| `zod` | **only** `commands/intake.ts` (`z`, `z.infer`, `ZodError`) | **NO, not recommended — see §5 (decision after ticket 01).** |
| `luxon` | **none** in `src/`. It is in `node_modules` only as a transitive dep of `caelus-birth` (imported in `node_modules/caelus-birth/dist/src/index.js`). Confirmed: **not a direct dep** in `package.json`. | Goes away on its own when caelus-birth is removed. Do not add. |
| `@types/bun` | devDep (`bun-types` is the old name; the current one is `@types/bun`) | **Keep** (dev). |
| `@biomejs/biome` | devDep | **Keep** (dev, lint/format). |
| `typescript` | peerDep `^5` | **Keep** (typecheck). |

### Recommended dependency list for lumen v2

```jsonc
"dependencies": {
	"axi-sdk-js": "^0.1.10"        // AXI framework + AxiError (errors/UX)
},
"devDependencies": {
	"@biomejs/biome": "^2.5.8",    // lint/format
	"@types/bun": "latest"         // Bun types
},
"peerDependencies": {
	"typescript": "^5"
}
// REMOVED: caelus, caelus-birth, zod (zod pending 01)
```

Reasons per package:
- **`axi-sdk-js` KEEP** — `runAxiCli` in `cli.ts` and `AxiError` in `commands/profile.ts` and `storage/profile-store.ts` are the skeleton of the v2 CLI as charted (map.md: "Stack: Bun + TypeScript + axi-sdk-js").
- **`caelus` / `caelus-birth` REMOVE** — confirmed: nothing in the cut (`profile-store.ts`, `commands/profile.ts`, `core/birth.ts`, `core/types.ts`) needs their symbols once `birth.ts` uses pure Meeus and the input contract carries an explicit offset. In particular `profile-store.ts` imports `ResolvedBirth`/`BirthStatus` from `core/types.ts` (which imports `UTResult` from caelus-birth); redefining those types in the v2 model (ticket 01) breaks the link. Additionally `adapters/geocode.ts` (out of scope in v2) pulls from `caelus-birth/geocode`.
- **`zod` RECOMMENDATION: remove** — it is the only validation source and lives solely in `intake.ts`, a module the v2 cut redesigns. The v2 input contract is tiny (~7 fields): integer ranges + days-per-month/leap + offset ±840 ≈ 30 lines of pure arithmetic (which also avoids the `Date.UTC` years-0–99 footgun; see §3). The core (`core/birth.ts`) is already zod-free today — zod exists only at the intake seam. With AxiError messages it is equally expressive and simpler. **HOWEVER** the ticket says the final zod decision depends on the data contract of ticket 01: if 01 defines the shared model types with zod schemas, keeping it is defensible (cost ~1 dep, derived types via `z.infer`). Firm recommendation: *drop zod; hand-rolled validation*, unless 01 decides otherwise (open point, §6).

---

## 5. Note: the decision point that closes after ticket 01

The fact-finding (formula, vectors, dependency tree except zod) **does not depend** on ticket 01 and is resolved here. The final `zod` decision **is** closed by 01: if the v2 data model (fields of `ResolvedBirth`/`StoredProfile`, input contract) is specified with zod schemas, keep it; if not, remove it. This ticket's recommendation is *remove* (hand-rolled validation), in line with the pivot's radical cut.

---

## 6. Cited sources (primary)

1. **Meeus, *Astronomical Algorithms*, 2nd ed. (Willmann-Bell, 1998), ch. 7 "Julian Day"** — recommended algorithm. (Verified by execution; the book's examples 7.a and 7.b as vectors 4 and 5.)
2. **Fliegel & Van Flandern, "Letters to the Editor", *Communications of the ACM* 11(10):657 (1968)** — equivalent integer formula. (Verified by execution, bit-for-bit identical to Meeus over the tested range.)
3. **`node_modules/caelus/dist/src/core.js` (lines 43–53)** — caelus's `julianDay` = Meeus ch. 7 verbatim; source of the numeric-continuity claim.
4. **`node_modules/caelus-birth/dist/src/index.js`** — `toUT`: delegates JD to caelus's `julianDay`; adds IANA zone resolution via `tz-lookup` + `luxon` (origin of the transitive luxon dep) and bounds offsets at ±14 h; source of the `status`/`dst` that v2 removes.
5. **`package.json` of the repo** — direct deps: `axi-sdk-js`, `caelus`, `caelus-birth`, `zod`; dev: `@biomejs/biome`, `@types/bun`; peer: `typescript`. `luxon` absent (only transitive).
6. **`src/` of the repo** — import map of §4 (grep over all `src/**/*.ts`).
7. **MDN `Date.UTC`** — mapping of years 0–99 onto the 20th century (verified by execution in the repo: `Date.UTC(50,…)` → 1950).