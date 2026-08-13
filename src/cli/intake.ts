import { AxiError } from "axi-sdk-js";
import type { BodyId, HouseSystem, Zodiac } from "caelus";
import { toUT, type UTResult } from "caelus-birth";
import { type Geocoder, openMeteoGeocoder } from "caelus-birth/geocode";
import {
	birthSchema,
	birthSuggestions,
	chartFlagSpec,
	type FlagSpec,
	optionsSchema,
	optionsSuggestions,
	parseWith,
} from "./schema";

interface ParsedArgs {
	values: Record<string, string>;
	flags: Set<string>;
	positionals: string[];
}

function parseFlags(args: string[], spec?: FlagSpec): ParsedArgs {
	const values: Record<string, string> = {};
	const flags = new Set<string>();
	const positionals: string[] = [];

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === undefined) continue;
		if (arg.startsWith("--")) {
			const eq = arg.indexOf("=");
			if (eq !== -1) {
				values[arg.slice(2, eq)] = arg.slice(eq + 1);
				continue;
			}
			const name = arg.slice(2);
			const acceptsValue = spec ? spec.value.includes(name) : true;
			const next = args[i + 1];
			if (
				acceptsValue &&
				next !== undefined &&
				(!next.startsWith("-") || !Number.isNaN(Number(next)))
			) {
				values[name] = next;
				i++;
			} else {
				flags.add(name);
			}
		} else if (arg.startsWith("-") && arg.length > 1) {
			flags.add(arg.slice(1));
		} else {
			positionals.push(arg);
		}
	}

	return { values, flags, positionals };
}

function assertKnownFlags(
	parsed: ParsedArgs,
	spec: FlagSpec,
	command: string,
): void {
	const valid = [...spec.value, ...spec.boolean, "help"];

	for (const name of parsed.flags) {
		if (spec.value.includes(name)) {
			throw new AxiError(`Flag --${name} requires a value`, "INVALID_VALUE", [
				`Example: --${name} <value>`,
			]);
		}
	}

	for (const name of [...parsed.flags, ...Object.keys(parsed.values)]) {
		if (!valid.includes(name)) {
			throw new AxiError(
				`Unknown flag --${name} for \`${command}\``,
				"VALIDATION_ERROR",
				[`Valid flags for \`${command}\`: --${valid.join(", --")}`],
			);
		}
	}

	if (parsed.positionals.length > 0) {
		throw new AxiError(
			`Unexpected argument: ${parsed.positionals.join(" ")}`,
			"VALIDATION_ERROR",
			[`Usage: lumen ${command} [flags]`],
		);
	}
}

function parseAndAssertFlags(
	args: string[],
	spec: FlagSpec,
	command: string,
): ParsedArgs {
	const parsed = parseFlags(args, spec);
	if (!parsed.flags.has("help")) {
		assertKnownFlags(parsed, spec, command);
	}
	return parsed;
}

export type BirthStatus = UTResult["status"];

export interface BirthClockFields {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
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
	draconic: boolean;
	eclipses: boolean;
	lots: boolean;
	stars: boolean;
	evolutionary: boolean;
}

export interface NatalRequest {
	birth: ResolvedBirth;
	options: ChartRequestOptions;
}

export type IntakeResult =
	| { kind: "request"; request: NatalRequest }
	| { kind: "help" };

interface WhenFields {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
}

const CLOCK_KEYS = ["year", "month", "day", "hour", "minute"] as const;

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
	const [, a, b, c, h, mi] = match.m;
	const date = match.p.order === "ymd" ? [a, b, c] : [c, b, a];
	return {
		year: Number(date[0]),
		month: Number(date[1]),
		day: Number(date[2]),
		hour: h === undefined ? 0 : Number(h),
		minute: mi === undefined ? 0 : Number(mi),
	};
}

function hasClockFlags(values: Record<string, unknown>): boolean {
	return CLOCK_KEYS.some((key) => values[key] !== undefined);
}

async function mergeBirthInput(
	values: Record<string, string>,
	geocoder: Geocoder,
): Promise<Record<string, unknown>> {
	const merged: Record<string, unknown> = {};

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
		merged.year = fields.year;
		merged.month = fields.month;
		merged.day = fields.day;
		merged.hour = fields.hour;
		merged.minute = fields.minute;
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
		let results: Awaited<ReturnType<Geocoder["search"]>>;
		let timer: ReturnType<typeof setTimeout> | undefined;
		try {
			const timeoutPromise = new Promise<never>((_, reject) => {
				timer = setTimeout(
					() => reject(new Error("Geocoding request timed out after 5s")),
					5000,
				);
			});
			results = await Promise.race([geocoder.search(place, 1), timeoutPromise]);
		} catch (err) {
			if (err instanceof AxiError) throw err;
			throw new AxiError(
				`Geocoding failed for place "${place}": ${err instanceof Error ? err.message : String(err)}`,
				"NETWORK_ERROR",
				["Ensure you are online or use --lat and --lon directly"],
			);
		} finally {
			if (timer !== undefined) clearTimeout(timer);
		}
		const top = results[0];
		if (top === undefined) {
			throw new AxiError(`No results for place "${place}"`, "NOT_FOUND", [
				'Try a more specific query like "Magangué, Colombia"',
			]);
		}
		merged.lat = top.lat;
		merged.lon = top.lon;
		if (merged.zone === undefined && top.timezone !== undefined) {
			merged.zone = top.timezone;
		}
	}

	return merged;
}

function resolveBirth(values: Record<string, unknown>): ResolvedBirth {
	const fields = parseWith(birthSchema, values, birthSuggestions);
	let t: ReturnType<typeof toUT>;
	try {
		t = toUT({
			year: fields.year,
			month: fields.month,
			day: fields.day,
			hour: fields.hour,
			minute: fields.minute,
			lat: fields.lat,
			lon: fields.lon,
			zone: fields.zone,
		});
	} catch (err) {
		if (err instanceof AxiError) throw err;
		const message = err instanceof Error ? err.message : String(err);
		if (message.includes("IANA time zone")) {
			throw new AxiError(
				`Invalid timezone: "${fields.zone}"`,
				"INVALID_VALUE",
				["Use a valid IANA timezone like America/New_York or UTC"],
			);
		}
		throw new AxiError(`Birth resolution failed: ${message}`, "INVALID_VALUE");
	}

	return {
		jdUt: t.jdUt,
		lat: fields.lat,
		lon: fields.lon,
		local: {
			year: fields.year,
			month: fields.month,
			day: fields.day,
			hour: fields.hour,
			minute: fields.minute,
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
			topocentric: flags.has("topocentric"),
			draconic: flags.has("draconic"),
			eclipses: flags.has("eclipses"),
			lots: flags.has("lots"),
			stars: flags.has("stars"),
			evolutionary: flags.has("evolutionary"),
		},
		optionsSuggestions,
	);
	return parsed;
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

/** Deep intake entrypoint: parses raw CLI args, checks help, asserts known flags,
 *  resolves birth date/place, and validates chart request options. */
export async function resolveNatalRequestFromArgs(
	args: string[],
	geocoder: Geocoder = openMeteoGeocoder,
): Promise<IntakeResult> {
	const parsed = parseAndAssertFlags(args, chartFlagSpec, "chart");

	if (parsed.flags.has("help")) {
		return { kind: "help" };
	}

	const request = await resolveNatalRequest(
		parsed.values,
		parsed.flags,
		geocoder,
	);
	return { kind: "request", request };
}
