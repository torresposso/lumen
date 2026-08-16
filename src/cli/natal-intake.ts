import { AxiError } from "axi-sdk-js";
import {
	BODIES,
	type BodyId,
	EXTRA_BODIES,
	HOUSE_SYSTEMS,
	type HouseSystem,
	normalizeHouseSystem,
} from "caelus";
import { z } from "zod";
import { type Geocoder, openMeteoGeocoder } from "../adapters/geocode";
import {
	type BirthClockFields,
	type BirthFields,
	type BirthStatus,
	birthSchema,
	birthSuggestions,
	mergeBirthInput,
	parseWith,
	type ResolvedBirth,
	resolveBirth,
} from "../core/birth";

export type { BirthClockFields, BirthFields, BirthStatus, ResolvedBirth };
export { birthSchema, birthSuggestions, parseWith };

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
					.filter(Boolean) as BodyId[],
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

export const chartUsage = [
	'lumen chart --when 1981-01-26T00:50 --place "Magangué, Colombia"',
	"",
	"Birth:",
	"  --when                                    Flexible date/time: 1981-01-26T00:50 | 26/01/1981 00:50 | 1981-01-26",
	"  --place                                   Place name, geocoded to lat/lon/zone (needs network)",
	"  --year, --month, --day, --hour, --minute   Alternative to --when (local clock time)",
	"  --lat, --lon                               Birthplace coordinates (lon east-positive); alternative to --place",
	"  --zone                                     Optional IANA timezone override",
	"Options:",
	"  --house-system                             placidus (default) | porphyry | equal | whole_sign | ...",
	"  --zodiac                                   tropical (default, Western astrology)",
	"  --node                                     both (default) | mean | true",
	"  --bodies                                   Extra bodies, comma-separated: mean_lilith,true_lilith",
	"  --topocentric                              Enable topocentric parallax",
	"  --draconic                                 Re-project chart onto lunar-node zodiac (0° Aries North Node)",
	"  --eclipses                                 Include prenatal solar and lunar eclipses",
	"  --lots                                     Include Hermetic Lots (Lot of Spirit, Lot of Fortune)",
	"  --stars                                    Include major Fixed Star conjunctions (orb <= 1.5°)",
	"  --evolutionary                             Include Jeffrey Wolf Green evolutionary triad & skipped steps",
].join("\n");

interface ParsedArgs {
	values: Record<string, string>;
	flags: Set<string>;
	positionals: string[];
}

function parseBooleanFlag(name: string, raw: string): boolean {
	const value = raw.trim().toLowerCase();
	if (value === "true") return true;
	if (value === "false") return false;
	throw new AxiError(
		`Flag --${name} expects true or false`,
		"VALIDATION_ERROR",
		[`Example: --${name}=true`],
	);
}

function parseFlags(args: string[], spec?: FlagSpec): ParsedArgs {
	const values: Record<string, string> = {};
	const flags = new Set<string>();
	const positionals: string[] = [];
	const booleanNames = spec ? [...spec.boolean, "help"] : [];

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === undefined) continue;
		if (arg.startsWith("--")) {
			const eq = arg.indexOf("=");
			if (eq !== -1) {
				const name = arg.slice(2, eq);
				const rawValue = arg.slice(eq + 1);
				if (booleanNames.includes(name)) {
					if (parseBooleanFlag(name, rawValue)) {
						flags.add(name);
					}
				} else {
					values[name] = rawValue;
				}
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
			throw new AxiError(
				`Flag --${name} requires a value`,
				"VALIDATION_ERROR",
				[`Example: --${name} <value>`],
			);
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

export type ChartRequestOptions = OptionsFields;

export interface NatalRequest {
	birth: ResolvedBirth;
	options: ChartRequestOptions;
}

export type IntakeResult =
	| { kind: "request"; request: NatalRequest }
	| { kind: "help" };

function parseRequested(
	values: Record<string, string>,
	flags: Set<string>,
): ChartRequestOptions {
	return parseWith(
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

export async function resolveNatalRequestFromArgs(
	args: string[],
	geocoder: Geocoder = openMeteoGeocoder,
	command = "chart",
): Promise<IntakeResult> {
	const parsed = parseAndAssertFlags(args, chartFlagSpec, command);

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

/** Facade for natal chart input validation, geocoding, timezone resolution,
 *  and command-line argument processing. */
export const NatalIntake = {
	flagSpec: chartFlagSpec,
	usage: chartUsage,

	/** Parses raw CLI arguments into a validated NatalRequest or help signal. */
	async process(
		args: string[],
		geocoder: Geocoder | undefined = openMeteoGeocoder,
		command = "chart",
	): Promise<IntakeResult> {
		return resolveNatalRequestFromArgs(
			args,
			geocoder ?? openMeteoGeocoder,
			command,
		);
	},

	/** Resolves validated birth data and chart options from parsed key-value inputs and flags. */
	async resolve(
		values: Record<string, string>,
		flags: Set<string>,
		geocoder: Geocoder = openMeteoGeocoder,
	): Promise<NatalRequest> {
		return resolveNatalRequest(values, flags, geocoder);
	},

	/** Direct validation helper for birth data parameters. */
	validateBirth(values: Record<string, unknown>): ResolvedBirth {
		return resolveBirth(values);
	},
} as const;
