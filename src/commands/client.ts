import type { AxiCliCommand } from "axi-sdk-js";
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
	type BirthInputFields,
	BirthResolutionError,
	resolveBirth as resolveBirthCore,
} from "../core/birth";
import type {
	BirthStatus,
	ChartRequestOptions as CoreChartRequestOptions,
	NatalRequest as CoreNatalRequest,
	ResolvedBirth,
} from "../core/types";
import type { ClientStore } from "../storage/client-store";
import { ClientStore as DefaultClientStore } from "../storage/client-store";
import type { ConsultationStore } from "../storage/consultation-store";

export type { BirthClockFields, BirthStatus, ResolvedBirth };

/** Runtime context injected into every AXI command. */
export interface CliContext {
	profiles: ClientStore;
	consultations: ConsultationStore;
}

// ============================================================================
// Zod intake seam (the only place zod and AxiError meet user input)
// ============================================================================

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

export interface WhenFields {
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
		throw new AxiError(`Could not parse --when "${raw}"`, "VALIDATION_ERROR", [
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
		return new AxiError("Invalid input", "VALIDATION_ERROR");
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
		"VALIDATION_ERROR",
		suggestion === undefined ? undefined : [suggestion],
	);
}

export function parseWith<Output>(
	schema: z.ZodType<Output, unknown>,
	input: Record<string, unknown>,
	suggestions: Record<string, string>,
): Output {
	const result = schema.safeParse(input);
	if (result.success) return result.data;
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
				"VALIDATION_ERROR",
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
				"VALIDATION_ERROR",
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

/** Maps pure core birth resolution failures into AXI validation errors. */
export function resolveBirth(values: Record<string, unknown>): ResolvedBirth {
	const fields = parseWith(birthSchema, values, birthSuggestions);
	try {
		return resolveBirthCore(fields as BirthInputFields);
	} catch (err) {
		if (err instanceof BirthResolutionError) {
			if (err.reason === "timezone") {
				throw new AxiError(err.message, "VALIDATION_ERROR", [
					"Use a valid IANA timezone like America/New_York or UTC",
				]);
			}
			throw new AxiError(err.message, "INVALID_VALUE");
		}
		throw err;
	}
}

// ============================================================================
// Natal chart option schema and flag parsing
// ============================================================================

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
			if (!booleanSet.has(flagName)) value.add(flagName);
		}
	}
	return { value: [...value], boolean: [...booleanSet] };
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
					if (parseBooleanFlag(name, rawValue)) flags.add(name);
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
	if (!parsed.flags.has("help")) assertKnownFlags(parsed, spec, command);
	return parsed;
}

export type ChartRequestOptions = CoreChartRequestOptions;
export type NatalRequest = CoreNatalRequest;

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
	if (parsed.flags.has("help")) return { kind: "help" };
	return {
		kind: "request",
		request: await resolveNatalRequest(parsed.values, parsed.flags, geocoder),
	};
}

/** Facade for natal chart input validation, geocoding, timezone resolution,
 *  and command-line argument processing. */
export const NatalIntake = {
	flagSpec: chartFlagSpec,
	usage: chartUsage,

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

	async resolve(
		values: Record<string, string>,
		flags: Set<string>,
		geocoder: Geocoder = openMeteoGeocoder,
	): Promise<NatalRequest> {
		return resolveNatalRequest(values, flags, geocoder);
	},

	validateBirth(values: Record<string, unknown>): ResolvedBirth {
		return resolveBirth(values);
	},
} as const;

// ============================================================================
// Profile selection helpers (shared by AXI commands)
// ============================================================================

export interface ProfileSelection {
	name?: string;
	rest: string[];
}

export function takeProfileArg(args: string[]): ProfileSelection {
	let name: string | undefined;
	const rest: string[] = [];

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === undefined) continue;
		if (arg === "--profile") {
			if (name !== undefined) {
				throw new AxiError(
					"Flag --profile was provided more than once",
					"VALIDATION_ERROR",
					["Use --profile exactly once"],
				);
			}
			const next = args[i + 1];
			if (next === undefined || next.startsWith("-")) {
				throw new AxiError(
					"Flag --profile requires a value",
					"VALIDATION_ERROR",
					["Example: --profile erik"],
				);
			}
			name = next;
			i++;
			continue;
		}
		if (arg.startsWith("--profile=")) {
			if (name !== undefined) {
				throw new AxiError(
					"Flag --profile was provided more than once",
					"VALIDATION_ERROR",
					["Use --profile exactly once"],
				);
			}
			name = arg.slice("--profile=".length);
			if (name === "") {
				throw new AxiError(
					"Flag --profile requires a value",
					"VALIDATION_ERROR",
					["Example: --profile erik"],
				);
			}
			continue;
		}
		rest.push(arg);
	}

	return { name, rest };
}

export function requestFromProfile(
	context: CliContext | undefined,
	name: string,
): NatalRequest {
	const profile = context?.profiles.get(name);
	if (profile === undefined) {
		throw new AxiError(`Unknown client: ${name}`, "VALIDATION_ERROR", [
			"Run `lumen client list` to see saved clients",
			`Run \`lumen client add ${name} --when ... --place ...\``,
		]);
	}
	return {
		birth: profile.birth,
		options: { ...profile.options },
	};
}

// ============================================================================
// `lumen client` command (alias `profile`)
// ============================================================================

export const clientUsage = [
	'lumen client add <id> --when 1981-01-26T00:50 --place "Magangué, Colombia"',
	"lumen client list",
	"lumen client show <id>",
	"lumen client remove <id>",
	"",
	"Guarda y gestiona datos de nacimiento de consultantes/perfiles locales.",
].join("\n");

const CLIENT_FLAG_REFERENCE = NatalIntake.usage.split("\n").slice(2).join("\n");

export const clientAddUsage = [
	'lumen client add <id> --when 1981-01-26T00:50 --place "Magangué, Colombia"',
	"",
	"Guarda o actualiza un cliente local para reutilizarlo en lecturas.",
	"",
	CLIENT_FLAG_REFERENCE,
].join("\n");

export const clientListUsage = [
	"lumen client list",
	"",
	"Lista los clientes guardados sin exponer fechas de nacimiento:",
	"solo id, procedencia válida y estado de sesión (abierta/cerrada).",
].join("\n");

export const clientShowUsage = [
	"lumen client show <id>",
	"",
	"Muestra el perfil del consultante, incluyendo datos de nacimiento y opciones.",
].join("\n");

export const clientRemoveUsage = [
	"lumen client remove <id>",
	"",
	"Elimina un cliente local. Eliminar un cliente ausente es un no-op exitoso.",
].join("\n");

function store(context: CliContext | undefined): ClientStore {
	return context?.profiles ?? new DefaultClientStore();
}

function assertNoFlags(args: string[], command: string): void {
	if (args.some((arg) => arg.startsWith("-"))) {
		throw new AxiError(
			`Unexpected flag for \`${command}\``,
			"VALIDATION_ERROR",
			[`Run \`${command} --help\` for usage`],
		);
	}
}

export const clientCommand: AxiCliCommand<CliContext> = async (
	args,
	context,
) => {
	const [sub, ...rest] = args;

	if (sub === undefined || sub === "--help") return clientUsage;
	if (rest.includes("--help")) {
		switch (sub) {
			case "add":
				return clientAddUsage;
			case "list":
				return clientListUsage;
			case "show":
				return clientShowUsage;
			case "remove":
				return clientRemoveUsage;
			default:
				return clientUsage;
		}
	}

	switch (sub) {
		case "add": {
			const id = rest[0];
			if (id === undefined || id.startsWith("-")) {
				throw new AxiError(
					"client add requires a client id",
					"VALIDATION_ERROR",
					["Run `lumen client add <id> --when ... --place ...`"],
				);
			}
			const result = await NatalIntake.process(
				rest.slice(1),
				undefined,
				"client add",
			);
			if (result.kind === "help") return clientAddUsage;
			store(context).add(id, result.request);
			return {
				client: id,
				status: "saved",
				help: [
					`Run \`lumen soul ${id}\` for baseline evolutionary reading`,
					`Run \`lumen consulta abrir ${id}\` to start consultation`,
				],
			};
		}
		case "list": {
			assertNoFlags(rest, "lumen client list");
			const sessions = context?.consultations;
			const clients = store(context)
				.list()
				.map((client) => ({
					id: client.id,
					provenance: client.birthStatus,
					session: sessions?.get(client.id)?.status ?? "none",
				}));
			if (clients.length === 0) {
				return {
					clients: "0 clients found",
					help: ['Run `lumen client add <id> --when "..." --place "..."`'],
				};
			}
			return { clients };
		}
		case "show": {
			assertNoFlags(rest, "lumen client show");
			const id = rest[0];
			if (id === undefined) {
				throw new AxiError(
					"client show requires a client id",
					"VALIDATION_ERROR",
					["Run `lumen client show <id>`"],
				);
			}
			const profile = store(context).get(id);
			if (profile === undefined) {
				throw new AxiError(`Unknown client: ${id}`, "VALIDATION_ERROR", [
					"Run `lumen client list` to see saved clients",
				]);
			}
			return {
				client: {
					id: profile.id,
					birth: profile.birth,
					options: profile.options,
					updatedAt: profile.updatedAt,
				},
			};
		}
		case "remove": {
			assertNoFlags(rest, "lumen client remove");
			const id = rest[0];
			if (id === undefined) {
				throw new AxiError(
					"client remove requires a client id",
					"VALIDATION_ERROR",
					["Run `lumen client remove <id>`"],
				);
			}
			const removed = store(context).remove(id);
			return {
				client: id,
				status: removed ? "removed" : "already absent (no-op)",
			};
		}
		default:
			throw new AxiError(`Unknown client command: ${sub}`, "VALIDATION_ERROR", [
				"Run `lumen client --help` for valid subcommands",
			]);
	}
};

export const profileUsage = clientUsage.replace(/client/g, "profile");
export const profileAddUsage = clientAddUsage.replace(/client/g, "profile");
export const profileListUsage = clientListUsage.replace(/client/g, "profile");
export const profileShowUsage = clientShowUsage.replace(/client/g, "profile");
export const profileRemoveUsage = clientRemoveUsage.replace(
	/client/g,
	"profile",
);

/** Retrocompatible `profile` alias for `client`. */
export const profileCommand: AxiCliCommand<CliContext> = async (
	args,
	context,
) => {
	try {
		const res = await clientCommand(args, context);
		if (typeof res === "string") return res.replace(/client/g, "profile");
		if (typeof res === "object" && res !== null) {
			const obj = res as Record<string, unknown>;
			if ("clients" in obj) {
				const { clients, ...rest } = obj;
				return { ...rest, profiles: clients };
			}
			if ("client" in obj) {
				const { client, ...rest } = obj;
				return { ...rest, profile: client };
			}
		}
		return res;
	} catch (err) {
		if (err instanceof AxiError) {
			const withHelp = err as AxiError & { help?: string[] };
			const rewrittenMessage = err.message.replace(/client/g, "profile");
			const rewrittenHelp = (withHelp.help ?? []).map((h) =>
				h.replace(/client/g, "profile"),
			);
			throw new AxiError(rewrittenMessage, err.code, rewrittenHelp);
		}
		throw err;
	}
};
