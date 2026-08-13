import { AxiError } from "axi-sdk-js";
import {
	BODIES,
	EXTRA_BODIES,
	HOUSE_SYSTEMS,
	type HouseSystem,
	normalizeHouseSystem,
} from "caelus";
import { z } from "zod";

export interface FlagSpec {
	value: readonly string[];
	boolean: readonly string[];
}

interface SchemaShape {
	shape: Record<string, unknown>;
}

function toFlagName(key: string): string {
	return key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

export function deriveFlagSpec(
	schemas: SchemaShape[],
	extras: FlagSpec,
): FlagSpec {
	const booleanSet = new Set<string>(extras.boolean);
	const value = new Set<string>(extras.value);
	for (const schema of schemas) {
		for (const key of Object.keys(schema.shape)) {
			const flagName = toFlagName(key);
			if (!booleanSet.has(flagName)) {
				value.add(flagName);
			}
		}
	}
	return {
		value: [...value],
		boolean: [...booleanSet],
	};
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

function isHouseSystem(value: unknown): boolean {
	if (typeof value !== "string") return false;
	try {
		normalizeHouseSystem(value);
		return true;
	} catch {
		return false;
	}
}

const KNOWN_BODIES = new Set<string>([...BODIES, ...EXTRA_BODIES]);

export const optionsSchema = z.object({
	houseSystem: z
		.custom<HouseSystem>(isHouseSystem, "not a known house system")
		.default("placidus")
		.transform(normalizeHouseSystem),
	zodiac: z
		.enum(["tropical"], {
			message: 'zodiac must be "tropical" (Western astrology)',
		})
		.default("tropical"),
	node: z.enum(["both", "mean", "true"]).default("both"),
	bodies: z
		.string()
		.default("")
		.transform(
			(raw) =>
				raw
					.split(",")
					.map((b) => b.trim())
					.filter(Boolean) as import("caelus").BodyId[],
		)
		.superRefine((ids, ctx) => {
			const unknown = ids.find((id) => !KNOWN_BODIES.has(id));
			if (unknown !== undefined) {
				ctx.addIssue({
					code: "custom",
					path: ["bodies"],
					message: `unknown body: ${unknown}`,
				});
			}
		}),
	topocentric: z.boolean().default(false),
	draconic: z.boolean().default(false),
	eclipses: z.boolean().default(false),
	lots: z.boolean().default(false),
	stars: z.boolean().default(false),
	evolutionary: z.boolean().default(false),
});

export type OptionsFields = z.infer<typeof optionsSchema>;

export const optionsSuggestions: Record<string, string> = {
	houseSystem: `Valid: ${HOUSE_SYSTEMS.join(", ")}`,
	zodiac: "Valid: tropical (lumen is dedicated to Western astrology)",
	node: "Valid: both (default) | mean | true",
	bodies: `Valid: ${EXTRA_BODIES.join(", ")}`,
	topocentric: "Valid: --topocentric",
	draconic: "Valid: --draconic",
	eclipses: "Valid: --eclipses",
	lots: "Valid: --lots",
	stars: "Valid: --stars",
	evolutionary: "Valid: --evolutionary",
};

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

/** The chart command's flag vocabulary, derived from the schemas so the
 *  validation surface and the CLI spec can never drift apart. `when` and
 *  `place` are intake-level inputs merged before validation. */
export const chartFlagSpec: FlagSpec = deriveFlagSpec(
	[birthSchema, optionsSchema],
	{
		value: ["when", "place"],
		boolean: [
			"topocentric",
			"draconic",
			"eclipses",
			"lots",
			"stars",
			"evolutionary",
		],
	},
);

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
			"MISSING_FLAG",
			suggestion === undefined ? undefined : [suggestion],
		);
	}
	return new AxiError(
		`Invalid value for --${name}: ${issue.message}`,
		"INVALID_VALUE",
		suggestion === undefined ? undefined : [suggestion],
	);
}
