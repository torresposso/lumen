import { AxiError } from "axi-sdk-js";
import { toUT, type UTResult } from "caelus-birth";
import type { Geocoder } from "caelus-birth/geocode";
import { z } from "zod";

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

export const birthSchema = z
	.object({
		year: z.coerce.number().int().min(1),
		month: z.coerce.number().int().min(1).max(12),
		day: z.coerce.number().int().min(1).max(31),
		hour: z.coerce.number().int().min(0).max(23),
		minute: z.coerce.number().int().min(0).max(59),
		lat: z.coerce.number().min(-90).max(90),
		lon: z.coerce.number().min(-180).max(180),
		zone: z.string().optional(),
	})
	.superRefine((val, ctx) => {
		const daysInMonth = new Date(Date.UTC(val.year, val.month, 0)).getUTCDate();
		if (val.day > daysInMonth) {
			ctx.addIssue({
				code: "custom",
				path: ["day"],
				message: `invalid day ${val.day} for month ${val.month} (max ${daysInMonth})`,
			});
		}
	});

export type BirthFields = z.infer<typeof birthSchema>;

export const birthSuggestions: Record<string, string> = {
	year: "Example: --year 1990",
	month: "Example: --month 6",
	day: "Example: --day 10",
	hour: "Example: --hour 14",
	minute: "Example: --minute 30",
	lat: "Example: --lat 27.95 (Tampa, FL)",
	lon: "Example: --lon -82.46 (east-positive, Americas are negative)",
	zone: "Example: --zone America/New_York",
};

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

export function parseWhen(raw: string): WhenFields {
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

export function hasClockFlags(values: Record<string, unknown>): boolean {
	return CLOCK_KEYS.some((key) => values[key] !== undefined);
}

function toAxiError(
	error: z.ZodError,
	input: Record<string, unknown>,
	suggestions: Record<string, string>,
): AxiError {
	const issue = error.issues[0];
	if (issue === undefined) {
		return new AxiError("Invalid input", "INVALID_VALUE");
	}
	const name = String(issue.path[0] ?? "");
	const suggestion = suggestions[name];
	if (name !== "" && !(name in input)) {
		return new AxiError(
			`Missing required flag --${name}`,
			"VALIDATION_ERROR",
			suggestion === undefined ? undefined : [suggestion],
		);
	}
	return new AxiError(
		`Invalid value for --${name}: ${issue.message}`,
		"INVALID_VALUE",
		suggestion === undefined ? undefined : [suggestion],
	);
}

export function parseWith<Output>(
	schema: z.ZodType<Output, unknown>,
	input: Record<string, unknown>,
	suggestions: Record<string, string>,
): Output {
	const result = schema.safeParse(input);
	if (result.success) {
		return result.data;
	}
	throw toAxiError(result.error, input, suggestions);
}

export async function mergeBirthInput(
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

export function resolveBirth(values: Record<string, unknown>): ResolvedBirth {
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
