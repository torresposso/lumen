import { AxiError } from "axi-sdk-js";
import {
	checkIntRange,
	daysInMonth,
	julianDayUt,
	type LocalTime,
	MAX_OFFSET_MINUTES,
	MAX_YEAR,
	MIN_OFFSET_MINUTES,
	MIN_YEAR,
	NUMBER_RE,
	offsetToMinutes,
	pad2,
} from "./datetime";
import { type BirthInput, MAX_LAT, MAX_LON, MIN_LAT, MIN_LON } from "./model";

export {
	daysInMonth,
	isLeapYear,
	julianDayUt,
	type LocalTime,
	MAX_OFFSET_MINUTES,
	MAX_YEAR,
	MIN_OFFSET_MINUTES,
	MIN_YEAR,
} from "./datetime";

/** The raw `--when` / `--where` strings as received by `profile add`. */
export interface RawBirthInput {
	when: string;
	where: string;
}

export interface ParsedWhen {
	canonicalDateTime: string;
	local: LocalTime;
	offsetMinutes: number;
}

export interface ParsedWhere {
	birthLat: number;
	birthLon: number;
	birthPlace: string;
}

const DATETIME_RE =
	/^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{1,2}):(\d{1,2})(Z|[+-]\d{2}:\d{2})$/;

export function parseWhen(
	when: string,
	issues: string[],
	labels: { when: string },
): ParsedWhen | undefined {
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

export function parseWhere(
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
		if (
			!Number.isFinite(birthLat) ||
			birthLat < MIN_LAT ||
			birthLat > MAX_LAT
		) {
			issues.push(
				`${labels.where} latitude must be between ${MIN_LAT} and ${MAX_LAT}`,
			);
		}
	}

	if (!NUMBER_RE.test(lonText)) {
		issues.push(
			`${labels.where} longitude must be a decimal number (got "${lonText}")`,
		);
	} else {
		birthLon = Number(lonText);
		if (
			!Number.isFinite(birthLon) ||
			birthLon < MIN_LON ||
			birthLon > MAX_LON
		) {
			issues.push(
				`${labels.where} longitude must be between ${MIN_LON} and ${MAX_LON}`,
			);
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

export interface BirthInputLabels {
	when: string;
	where: string;
}

export function parseBirthInput(
	raw: RawBirthInput,
	labels: BirthInputLabels,
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
