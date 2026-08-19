import { AxiError } from "axi-sdk-js";
import { daysInMonth, julianDayUt, type LocalTime } from "./jd";
import type { BirthInput } from "./model";

export const MIN_YEAR = 1800;
export const MAX_YEAR = 2100;
export const MIN_OFFSET_MINUTES = -840;
export const MAX_OFFSET_MINUTES = 840;

/** The raw `--when` / `--where` strings as received by `profile add`. */
export interface RawBirthInput {
	when: string;
	where: string;
}

interface ParsedWhen {
	canonicalDateTime: string;
	local: LocalTime;
	offsetMinutes: number;
}

interface ParsedWhere {
	birthLat: number;
	birthLon: number;
	birthPlace: string;
}

const DATETIME_RE =
	/^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{1,2}):(\d{1,2})(Z|[+-]\d{2}:\d{2})$/;

const NUMBER_RE = /^[+-]?\d+(?:\.\d+)?$/;

function pad2(value: number): string {
	return String(value).padStart(2, "0");
}

function parseWhen(
	rawWhen: string,
	issues: string[],
	labels: { when: string },
): ParsedWhen | undefined {
	const when = rawWhen.trim();
	const match = DATETIME_RE.exec(when);
	if (match === null) {
		issues.push(
			`${labels.when} must look like "YYYY-MM-DDTHH:MM±HH:MM" or "…Z" (got "${when}")`,
		);
		return undefined;
	}

	const offsetSuffix = match[6] as string;
	const local: LocalTime = {
		year: Number(match[1]),
		month: Number(match[2]),
		day: Number(match[3]),
		hour: Number(match[4]),
		minute: Number(match[5]),
	};

	checkIntRange(issues, local.year, MIN_YEAR, MAX_YEAR, `${labels.when} year`);
	checkIntRange(issues, local.month, 1, 12, `${labels.when} month`);
	if (
		!Number.isInteger(local.day) ||
		local.day < 1 ||
		local.day > daysInMonth(local.year, local.month)
	) {
		issues.push(`${labels.when} day is invalid for that month`);
	}
	checkIntRange(issues, local.hour, 0, 23, `${labels.when} hour`);
	checkIntRange(issues, local.minute, 0, 59, `${labels.when} minute`);

	const offsetMinutes =
		offsetSuffix === "Z" ? 0 : offsetToMinutes(offsetSuffix, issues, labels);
	if (!Number.isNaN(offsetMinutes)) {
		checkIntRange(
			issues,
			offsetMinutes,
			MIN_OFFSET_MINUTES,
			MAX_OFFSET_MINUTES,
			`${labels.when} offset`,
		);
	}

	const canonicalDateTime = `${local.year}-${pad2(local.month)}-${pad2(local.day)}T${pad2(local.hour)}:${pad2(local.minute)}${offsetSuffix}`;
	return { canonicalDateTime, local, offsetMinutes: offsetMinutes ?? 0 };
}

function parseWhere(
	rawWhere: string,
	issues: string[],
	labels: { where: string },
): ParsedWhere | undefined {
	const where = rawWhere.trim();
	const whereParts = where.split(",");
	if (whereParts.length < 3) {
		issues.push(
			`${labels.where} must list coordinates then a place: "lat, lon, Place" (got "${where}")`,
		);
		return undefined;
	}

	let birthLat: number | undefined;
	let birthLon: number | undefined;
	let birthPlace: string | undefined;

	const latText = whereParts[0]?.trim() ?? "";
	const lonText = whereParts[1]?.trim() ?? "";

	if (!NUMBER_RE.test(latText)) {
		issues.push(
			`${labels.where} latitude must be a decimal number (got "${latText}")`,
		);
	} else {
		birthLat = Number(latText);
		if (!Number.isFinite(birthLat) || birthLat < -90 || birthLat > 90) {
			issues.push(`${labels.where} latitude must be between -90 and 90`);
		}
	}

	if (!NUMBER_RE.test(lonText)) {
		issues.push(
			`${labels.where} longitude must be a decimal number (got "${lonText}")`,
		);
	} else {
		birthLon = Number(lonText);
		if (!Number.isFinite(birthLon) || birthLon < -180 || birthLon > 180) {
			issues.push(`${labels.where} longitude must be between -180 and 180`);
		}
	}

	const place = whereParts
		.slice(2)
		.map((p) => p.trim())
		.join(", ")
		.trim();
	if (place === "") {
		issues.push(`${labels.where} place must not be empty`);
	} else {
		birthPlace = place;
	}

	if (
		birthLat === undefined ||
		birthLon === undefined ||
		birthPlace === undefined
	) {
		return undefined;
	}

	return { birthLat, birthLon, birthPlace };
}

/**
 * The birth-input contract — the single seam lumen applies to the raw strings
 * of `profile add`. `--when` is an ISO 8601 datetime *with* a UTC offset
 * (`YYYY-MM-DDTHH:MM±HH:MM` or `…Z`) — the offset is never a separate flag.
 * `--where` bundles the coordinates and the human-readable place:
 * `"lat, lon, Place"` (the place itself may contain commas, e.g.
 * `"9.15, -74.75, Magangué, Colombia"`), which yields `birthLat`/`birthLon`/
 * `birthPlace`.
 *
 * Parses the formats, validates the semantic ranges and derives `birthJdUt`
 * (Meeus ch. 7, via `julianDayUt`) in one pass, accumulating every *checkable*
 * violation: a field whose format does not parse cannot be range-checked (e.g.
 * `--when "garbage"`), but the other fields still are. On any violation throws
 * one `AxiError` with all cited rules as suggestions, so an agent caller gets
 * the whole contract verdict in one round-trip. Presence of the flags
 * themselves is the command's concern. The transient `local`/`offsetMinutes`
 * the derivation needs never appear in the result — the complete `birth*` set
 * leaves the seam.
 *
 * The caller supplies the flag labels (e.g. `ADD_FLAGS`) so this domain module
 * does not import the CLI vocabulary — the direction is `commands → domain`,
 * not `domain → cli` (ADR-0006). Defaults keep the historical `--when`/`--where`
 * wording for bare domain tests.
 */
export function parseBirthInput(
	raw: RawBirthInput,
	labels: { when: string; where: string } = {
		when: "--when",
		where: "--where",
	},
): BirthInput {
	const issues: string[] = [];

	const parsedWhen = parseWhen(raw.when, issues, labels);
	const parsedWhere = parseWhere(raw.where, issues, labels);

	if (
		issues.length > 0 ||
		parsedWhen === undefined ||
		parsedWhere === undefined
	) {
		throw new AxiError("Invalid birth input", "VALIDATION_ERROR", issues);
	}

	return {
		birthDateTime: parsedWhen.canonicalDateTime,
		birthJdUt: julianDayUt(parsedWhen.local, parsedWhen.offsetMinutes),
		birthLat: parsedWhere.birthLat,
		birthLon: parsedWhere.birthLon,
		birthPlace: parsedWhere.birthPlace,
	};
}

/** `Z` → 0; `±HH:MM` → signed minutes; `NaN` when malformed (contributes an issue). */
function offsetToMinutes(
	suffix: string,
	issues: string[],
	labels: { when: string },
): number {
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
		issues.push(`${labels.when} offset must be ±HH:MM, e.g. "-05:00" or "Z"`);
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
