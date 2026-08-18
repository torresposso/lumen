import { AxiError } from "axi-sdk-js";
import { daysInMonth } from "./jd";
import type { BirthClock, BirthInput } from "./types";

export const MIN_YEAR = 1800;
export const MAX_YEAR = 2100;
export const MIN_OFFSET_MINUTES = -840;
export const MAX_OFFSET_MINUTES = 840;

/** The raw `--when` / `--offset` / `--at` strings as received by `profile add`. */
export interface RawBirthInput {
	when: string;
	offset: string;
	at: string;
}

/**
 * The birth-input contract — the single seam lumen applies to the raw strings
 * of `profile add`. Parses the formats and validates the semantic ranges in one
 * pass, accumulating every *checkable* violation: a field whose format does not
 * parse cannot be range-checked (e.g. `--when "garbage"`), but the other fields
 * still are. On any violation throws one `AxiError` with all cited rules as
 * suggestions, so an agent caller gets the whole contract verdict in one
 * round-trip. Presence of the flags themselves is the command's concern.
 */
export function parseBirthInput(raw: RawBirthInput): BirthInput {
	const issues: string[] = [];

	const when = raw.when.trim();
	const whenMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})[T ](\d{1,2}):(\d{1,2})$/.exec(
		when,
	);
	let local: BirthClock | undefined;
	if (whenMatch === null) {
		issues.push(`--when must look like "YYYY-MM-DDTHH:MM" (got "${when}")`);
	} else {
		local = {
			year: Number(whenMatch[1]),
			month: Number(whenMatch[2]),
			day: Number(whenMatch[3]),
			hour: Number(whenMatch[4]),
			minute: Number(whenMatch[5]),
		};
		checkIntRange(issues, local.year, MIN_YEAR, MAX_YEAR, "--when year");
		checkIntRange(issues, local.month, 1, 12, "--when month");
		if (
			!Number.isInteger(local.day) ||
			local.day < 1 ||
			local.day > daysInMonth(local.year, local.month)
		) {
			issues.push("--when day is invalid for that month");
		}
		checkIntRange(issues, local.hour, 0, 23, "--when hour");
		checkIntRange(issues, local.minute, 0, 59, "--when minute");
	}

	const offsetText = raw.offset.trim();
	let offsetMinutes: number | undefined;
	if (!/^[+-]?\d+$/.test(offsetText)) {
		issues.push(
			`--offset must be an integer number of minutes (got "${offsetText}")`,
		);
	} else {
		offsetMinutes = Number(offsetText);
		checkIntRange(
			issues,
			offsetMinutes,
			MIN_OFFSET_MINUTES,
			MAX_OFFSET_MINUTES,
			"--offset",
		);
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
		local: local as BirthClock,
		offsetMinutes: offsetMinutes as number,
		lat,
		lon,
	};
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
