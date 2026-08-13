import { AxiError } from "axi-sdk-js";
import type { BodyId, HouseSystem, Zodiac } from "caelus";
import { toUT, type UTResult } from "caelus-birth";
import { type Geocoder, openMeteoGeocoder } from "caelus-birth/geocode";
import {
	birthSchema,
	birthSuggestions,
	optionsSchema,
	optionsSuggestions,
	parseWith,
} from "./schema";

export type BirthStatus = UTResult["status"];

export interface BirthClockFields {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
}

export interface ResolvedBirth {
	jdUt: number;
	lat: number;
	lon: number;
	local: BirthClockFields;
	zone: string;
	offsetMinutes: number;
	dst: boolean;
	status: BirthStatus;
}

export interface ChartRequestOptions {
	houseSystem: HouseSystem;
	zodiac: Zodiac;
	node: "both" | "mean" | "true";
	bodies: BodyId[];
	topocentric: boolean;
}

export interface NatalRequest {
	birth: ResolvedBirth;
	options: ChartRequestOptions;
}

interface WhenFields {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
}

const CLOCK_KEYS = [
	"year",
	"month",
	"day",
	"hour",
	"minute",
	"second",
] as const;

const WHEN_PATTERNS: { re: RegExp; order: "ymd" | "dmy" }[] = [
	{
		re: /^(\d{4})-(\d{1,2})-(\d{1,2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?$/,
		order: "ymd",
	},
	{
		re: /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?$/,
		order: "dmy",
	},
	{
		re: /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
		order: "ymd",
	},
	{
		re: /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/,
		order: "dmy",
	},
];

function parseWhen(raw: string): WhenFields {
	const match = WHEN_PATTERNS.map((p) => ({ p, m: p.re.exec(raw) })).find(
		(x) => x.m !== null,
	);
	if (match === undefined || match.m === null) {
		throw new AxiError(`Could not parse --when "${raw}"`, "INVALID_VALUE", [
			"Formats: 1981-01-26T00:50 | 1981-01-26 00:50 | 26/01/1981 00:50 | 1981-01-26",
		]);
	}
	const [, a, b, c, h, mi, s] = match.m;
	const date = match.p.order === "ymd" ? [a, b, c] : [c, b, a];
	return {
		year: Number(date[0]),
		month: Number(date[1]),
		day: Number(date[2]),
		hour: h === undefined ? 0 : Number(h),
		minute: mi === undefined ? 0 : Number(mi),
		second: s === undefined ? 0 : Number(s),
	};
}

function hasClockFlags(values: Record<string, string>): boolean {
	return CLOCK_KEYS.some((key) => values[key] !== undefined);
}

async function mergeBirthInput(
	values: Record<string, string>,
	geocoder: Geocoder,
): Promise<Record<string, string>> {
	const merged: Record<string, string> = {};

	for (const [key, value] of Object.entries(values)) {
		if (key === "when" || key === "place") continue;
		merged[key] = value;
	}

	const when = values.when;
	if (when !== undefined) {
		if (hasClockFlags(merged)) {
			throw new AxiError(
				"Cannot combine --when with individual date/time flags",
				"CONFLICT",
				["Use --when OR --year --month --day --hour --minute"],
			);
		}
		const fields = parseWhen(when);
		merged.year = String(fields.year);
		merged.month = String(fields.month);
		merged.day = String(fields.day);
		merged.hour = String(fields.hour);
		merged.minute = String(fields.minute);
		merged.second = String(fields.second);
	}

	const place = values.place;
	if (place !== undefined) {
		if (merged.lat !== undefined || merged.lon !== undefined) {
			throw new AxiError(
				"Cannot combine --place with --lat/--lon",
				"CONFLICT",
				["Use --place OR --lat --lon"],
			);
		}
		const results = await geocoder.search(place, 1);
		const top = results[0];
		if (top === undefined) {
			throw new AxiError(`No results for place "${place}"`, "NOT_FOUND", [
				'Try a more specific query like "Magangué, Colombia"',
			]);
		}
		merged.lat = String(top.lat);
		merged.lon = String(top.lon);
		if (merged.zone === undefined && top.timezone !== undefined) {
			merged.zone = top.timezone;
		}
	}

	return merged;
}

function resolveBirth(values: Record<string, string>): ResolvedBirth {
	const fields = parseWith(birthSchema, values, birthSuggestions);
	const t = toUT({
		year: fields.year,
		month: fields.month,
		day: fields.day,
		hour: fields.hour,
		minute: fields.minute,
		lat: fields.lat,
		lon: fields.lon,
		zone: fields.zone,
	});

	return {
		jdUt: t.jdUt + fields.second / 86400,
		lat: fields.lat,
		lon: fields.lon,
		local: {
			year: fields.year,
			month: fields.month,
			day: fields.day,
			hour: fields.hour,
			minute: fields.minute,
			second: fields.second,
		},
		zone: t.zone,
		offsetMinutes: t.offsetMinutes,
		dst: t.dst,
		status: t.status,
	};
}

function parseRequested(
	values: Record<string, string>,
	flags: Set<string>,
): ChartRequestOptions {
	const parsed = parseWith(
		optionsSchema,
		{
			houseSystem: values["house-system"],
			zodiac: values.zodiac,
			node: values.node,
			bodies: values.bodies,
		},
		optionsSuggestions,
	);
	return { ...parsed, topocentric: flags.has("topocentric") };
}

export async function resolveNatalRequest(
	values: Record<string, string>,
	flags: Set<string>,
	geocoder: Geocoder = openMeteoGeocoder,
): Promise<NatalRequest> {
	const merged = await mergeBirthInput(values, geocoder);
	return {
		birth: resolveBirth(merged),
		options: parseRequested(values, flags),
	};
}
