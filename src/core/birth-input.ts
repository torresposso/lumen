import { AxiError } from "axi-sdk-js";
import { daysInMonth } from "./jd";
import type { BirthInput, LocalTime } from "./types";

export const MIN_YEAR = 1800;
export const MAX_YEAR = 2100;
export const MIN_OFFSET_MINUTES = -840;
export const MAX_OFFSET_MINUTES = 840;

/** The raw `--birthdatetime` / `--birthlat` / `--birthlon` strings as received by `profile add`. */
export interface RawBirthInput {
	birthDateTime: string;
	birthLat: string;
	birthLon: string;
}

const DATETIME_RE =
	/^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{1,2}):(\d{1,2})(Z|[+-]\d{2}:\d{2})$/;

const NUMBER_RE = /^[+-]?\d+(?:\.\d+)?$/;

function pad2(value: number): string {
	return String(value).padStart(2, "0");
}

/**
 * The birth-input contract — the single seam lumen applies to the raw strings
 * of `profile add`. `--birthdatetime` is an ISO 8601 datetime *with* a UTC
 * offset (`YYYY-MM-DDTHH:MM±HH:MM` or `…Z`) — the offset is never a separate
 * flag; `--birthlat`/`--birthlon` are signed decimal degrees.
 *
 * Parses the formats and validates the semantic ranges in one pass,
 * accumulating every *checkable* violation: a field whose format does not
 * parse cannot be range-checked (e.g. `--birthdatetime "garbage"`), but the
 * other fields still are. On any violation throws one `AxiError` with all
 * cited rules as suggestions, so an agent caller gets the whole contract
 * verdict in one round-trip. Presence of the flags themselves is the
 * command's concern.
 */
export function parseBirthInput(raw: RawBirthInput): BirthInput {
	const issues: string[] = [];

	// --birthdatetime
	const dateTime = raw.birthDateTime.trim();
	const match = DATETIME_RE.exec(dateTime);
	let canonicalDateTime: string | undefined;
	let local: LocalTime | undefined;
	let offsetMinutes: number | undefined;
	if (match === null) {
		issues.push(
			`--birthdatetime must look like "YYYY-MM-DDTHH:MM±HH:MM" or "…Z" (got "${dateTime}")`,
		);
	} else {
		const offsetSuffix = match[6] as string;
		local = {
			year: Number(match[1]),
			month: Number(match[2]),
			day: Number(match[3]),
			hour: Number(match[4]),
			minute: Number(match[5]),
		};
		checkIntRange(
			issues,
			local.year,
			MIN_YEAR,
			MAX_YEAR,
			"--birthdatetime year",
		);
		checkIntRange(issues, local.month, 1, 12, "--birthdatetime month");
		if (
			!Number.isInteger(local.day) ||
			local.day < 1 ||
			local.day > daysInMonth(local.year, local.month)
		) {
			issues.push("--birthdatetime day is invalid for that month");
		}
		checkIntRange(issues, local.hour, 0, 23, "--birthdatetime hour");
		checkIntRange(issues, local.minute, 0, 59, "--birthdatetime minute");

		offsetMinutes =
			offsetSuffix === "Z" ? 0 : offsetToMinutes(offsetSuffix, issues);
		if (offsetMinutes !== undefined) {
			checkIntRange(
				issues,
				offsetMinutes,
				MIN_OFFSET_MINUTES,
				MAX_OFFSET_MINUTES,
				"--birthdatetime offset",
			);
		}

		canonicalDateTime = `${local.year}-${pad2(local.month)}-${pad2(local.day)}T${pad2(local.hour)}:${pad2(local.minute)}${offsetSuffix}`;
	}

	// --birthlat
	let birthLat = NaN;
	const latText = raw.birthLat.trim();
	if (!NUMBER_RE.test(latText)) {
		issues.push(`--birthlat must be a decimal number (got "${latText}")`);
	} else {
		birthLat = Number(latText);
		if (!Number.isFinite(birthLat) || birthLat < -90 || birthLat > 90) {
			issues.push("--birthlat must be a latitude between -90 and 90");
		}
	}

	// --birthlon
	let birthLon = NaN;
	const lonText = raw.birthLon.trim();
	if (!NUMBER_RE.test(lonText)) {
		issues.push(`--birthlon must be a decimal number (got "${lonText}")`);
	} else {
		birthLon = Number(lonText);
		if (!Number.isFinite(birthLon) || birthLon < -180 || birthLon > 180) {
			issues.push("--birthlon must be a longitude between -180 and 180");
		}
	}

	if (issues.length > 0) {
		throw new AxiError("Invalid birth input", "VALIDATION_ERROR", issues);
	}
	return {
		birthDateTime: canonicalDateTime as string,
		local: local as LocalTime,
		offsetMinutes: offsetMinutes as number,
		birthLat,
		birthLon,
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
		issues.push(`--birthdatetime offset must be ±HH:MM, e.g. "-05:00" or "Z"`);
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
