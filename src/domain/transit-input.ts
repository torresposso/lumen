import { AxiError } from "axi-sdk-js";
import type { ArgsSpec } from "../cli/args";
import {
	daysInMonth,
	julianDayUt,
	type LocalTime,
	MAX_OFFSET_MINUTES,
	MAX_YEAR,
	MIN_OFFSET_MINUTES,
	MIN_YEAR,
} from "./birth-input";
import { MAX_LAT, MAX_LON, MIN_LAT, MIN_LON } from "./model";

export const CHART_TRANSITS_SPEC: ArgsSpec = {
	known: new Set(["--when", "--where"]),
	required: new Set(["--when"]),
	positionals: 1,
	positionalName: "profile id",
	positionalHint: "Use the UUID printed by `lumen profile add`",
	rules: {
		"--when": { trim: true, nonEmpty: true },
		"--where": { trim: true, nonEmpty: true },
	},
};

export interface TransitTargetInput {
	dateTime: string;
	jdUt: number;
	place?: string;
	lat?: number;
	lon?: number;
}

export interface TransitInputLabels {
	when: string;
	where: string;
}

const DATETIME_RE =
	/^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{1,2}):(\d{1,2})(Z|[+-]\d{2}:\d{2})$/;

const NUMBER_RE = /^[+-]?\d+(?:\.\d+)?$/;

function pad2(value: number): string {
	return String(value).padStart(2, "0");
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

function parseTransitWhen(
	rawWhen: string | undefined,
	issues: string[],
	labels: { when: string },
):
	| { canonicalDateTime: string; local: LocalTime; offsetMinutes: number }
	| undefined {
	if (!rawWhen || rawWhen.trim() === "") {
		issues.push(`${labels.when} is required`);
		return undefined;
	}
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

function parseTransitWhere(
	rawWhere: string | undefined,
	issues: string[],
	labels: { where: string },
): { lat?: number; lon?: number; place?: string } | undefined {
	if (!rawWhere || rawWhere.trim() === "") {
		return {};
	}
	const where = rawWhere.trim();
	const whereParts = where.split(",");
	if (whereParts.length < 3) {
		issues.push(
			`${labels.where} must list coordinates then a place: "lat, lon, Place" (got "${where}")`,
		);
		return undefined;
	}

	let lat: number | undefined;
	let lon: number | undefined;
	let place: string | undefined;

	const latText = whereParts[0]?.trim() ?? "";
	const lonText = whereParts[1]?.trim() ?? "";

	if (!NUMBER_RE.test(latText)) {
		issues.push(
			`${labels.where} latitude must be a decimal number (got "${latText}")`,
		);
	} else {
		lat = Number(latText);
		if (!Number.isFinite(lat) || lat < MIN_LAT || lat > MAX_LAT) {
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
		lon = Number(lonText);
		if (!Number.isFinite(lon) || lon < MIN_LON || lon > MAX_LON) {
			issues.push(
				`${labels.where} longitude must be between ${MIN_LON} and ${MAX_LON}`,
			);
		}
	}

	const p = whereParts
		.slice(2)
		.map((part) => part.trim())
		.join(", ")
		.trim();
	if (p === "") {
		issues.push(`${labels.where} place must not be empty`);
	} else {
		place = p;
	}

	if (lat === undefined || lon === undefined || place === undefined) {
		return undefined;
	}

	return { lat, lon, place };
}

export function parseTransitInput(
	flags: ReadonlyMap<string, string | null>,
	labels: TransitInputLabels,
): TransitTargetInput {
	const issues: string[] = [];
	const rawWhen = flags.get(labels.when) ?? undefined;
	const rawWhere = flags.get(labels.where) ?? undefined;

	const parsedWhen = parseTransitWhen(rawWhen ?? undefined, issues, labels);
	const parsedWhere = parseTransitWhere(rawWhere ?? undefined, issues, labels);

	if (
		issues.length > 0 ||
		parsedWhen === undefined ||
		parsedWhere === undefined
	) {
		throw new AxiError("Invalid transit input", "VALIDATION_ERROR", issues);
	}

	return {
		dateTime: parsedWhen.canonicalDateTime,
		jdUt: julianDayUt(parsedWhen.local, parsedWhen.offsetMinutes),
		lat: parsedWhere.lat,
		lon: parsedWhere.lon,
		place: parsedWhere.place,
	};
}
