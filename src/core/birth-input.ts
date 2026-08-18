import { AxiError } from "axi-sdk-js";
import { daysInMonth } from "./jd";
import type { BirthClock, BirthInput } from "./types";

export const MIN_YEAR = 1800;
export const MAX_YEAR = 2100;
export const MIN_OFFSET_MINUTES = -840;
export const MAX_OFFSET_MINUTES = 840;

/** The raw `--when` / `--at` strings as received by `profile add`. */
export interface RawBirthInput {
	when: string;
	at: string;
}

const WHEN_RE =
	/^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{1,2}):(\d{1,2})(Z|[+-]\d{2}:\d{2})$/;

function pad2(value: number): string {
	return String(value).padStart(2, "0");
}

/**
 * The birth-input contract — the single seam lumen applies to the raw strings
 * of `profile add`. `--when` is an ISO 8601 datetime *with* a UTC offset
 * (`YYYY-MM-DDTHH:MM±HH:MM` or `…Z`) — the offset is never a separate flag.
 * Parses the formats and validates the semantic ranges in one pass,
 * accumulating every *checkable* violation: a field whose format does not
 * parse cannot be range-checked (e.g. `--when "garbage"`), but the other
 * fields still are. On any violation throws one `AxiError` with all cited
 * rules as suggestions, so an agent caller gets the whole contract verdict in
 * one round-trip. Presence of the flags themselves is the command's concern.
 */
export function parseBirthInput(raw: RawBirthInput): BirthInput {
	const issues: string[] = [];

	const when = raw.when.trim();
	const match = WHEN_RE.exec(when);
	let canonicalWhen: string | undefined;
	let clock: BirthClock | undefined;
	let offsetMinutes: number | undefined;
	if (match === null) {
		issues.push(
			`--when must look like "YYYY-MM-DDTHH:MM±HH:MM" or "…Z" (got "${when}")`,
		);
	} else {
		const offsetSuffix = match[6] as string;
		clock = {
			year: Number(match[1]),
			month: Number(match[2]),
			day: Number(match[3]),
			hour: Number(match[4]),
			minute: Number(match[5]),
		};
		checkIntRange(issues, clock.year, MIN_YEAR, MAX_YEAR, "--when year");
		checkIntRange(issues, clock.month, 1, 12, "--when month");
		if (
			!Number.isInteger(clock.day) ||
			clock.day < 1 ||
			clock.day > daysInMonth(clock.year, clock.month)
		) {
			issues.push("--when day is invalid for that month");
		}
		checkIntRange(issues, clock.hour, 0, 23, "--when hour");
		checkIntRange(issues, clock.minute, 0, 59, "--when minute");

		offsetMinutes =
			offsetSuffix === "Z" ? 0 : offsetToMinutes(offsetSuffix, issues);
		if (offsetMinutes !== undefined) {
			checkIntRange(
				issues,
				offsetMinutes,
				MIN_OFFSET_MINUTES,
				MAX_OFFSET_MINUTES,
				"--when offset",
			);
		}

		canonicalWhen = `${clock.year}-${pad2(clock.month)}-${pad2(clock.day)}T${pad2(clock.hour)}:${pad2(clock.minute)}${offsetSuffix}`;
	}

	const at = raw.at.trim();
	const atMatch = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(at);
	let lat = NaN;
	let lon = NaN;
	if (atMatch === null) {
		issues.push(
			`--at must look like "lat,lon" in decimal degrees (got "${at}")`,
		);
	} else {
		lat = Number(atMatch[1]);
		lon = Number(atMatch[2]);
		if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
			issues.push("--at latitude must be between -90 and 90");
		}
		if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
			issues.push("--at longitude must be between -180 and 180");
		}
	}

	if (issues.length > 0) {
		throw new AxiError("Invalid birth input", "VALIDATION_ERROR", issues);
	}
	return {
		when: canonicalWhen as string,
		clock: clock as BirthClock,
		offsetMinutes: offsetMinutes as number,
		lat,
		lon,
	};
}

/** `Z` → 0; `±HH:MM` → signed minutes; `NaN` when malformed (contributes an issue). */
function offsetToMinutes(suffix: string, issues: string[]): number {
	const sign = suffix.startsWith("-") ? -1 : 1;
	const [hh, mm] = suffix
		.slice(1)
		.split(":")
		.map((p) => Number(p));
	if (
		hh === undefined ||
		mm === undefined ||
		!Number.isInteger(hh) ||
		!Number.isInteger(mm) ||
		mm < 0 ||
		mm > 59
	) {
		issues.push(`--when offset must be ±HH:MM, e.g. "-05:00" or "Z"`);
		return NaN;
	}
	return sign * (hh * 60 + mm);
}

function checkIntRange(
	issues: string[],
	value: number,
	min: number,
	max: number,
	label: string,
): void {
	if (!Number.isInteger(value) || value < min || value > max) {
		issues.push(`${label} must be an integer ${min}..${max}`);
	}
}
