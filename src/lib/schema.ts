import { AxiError } from "axi-sdk-js";
import {
	AYANAMSA_J2000,
	BODIES,
	EXTRA_BODIES,
	HOUSE_SYSTEMS,
	type HouseSystem,
	normalizeHouseSystem,
	type Zodiac,
} from "caelus";
import { z } from "zod";
import { deriveFlagSpec, type FlagSpec } from "./flags";

export const birthSchema = z.object({
	year: z.coerce.number().int().min(1),
	month: z.coerce.number().int().min(1).max(12),
	day: z.coerce.number().int().min(1).max(31),
	hour: z.coerce.number().int().min(0).max(23),
	minute: z.coerce.number().int().min(0).max(59),
	second: z.coerce.number().int().min(0).max(59).default(0),
	lat: z.coerce.number().min(-90).max(90),
	lon: z.coerce.number().min(-180).max(180),
	zone: z.string().optional(),
});

export type BirthFields = z.infer<typeof birthSchema>;

export const birthSuggestions: Record<string, string> = {
	year: "Example: --year 1990",
	month: "Example: --month 6",
	day: "Example: --day 10",
	hour: "Example: --hour 14",
	minute: "Example: --minute 30",
	second: "Example: --second 0",
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

/** Star-anchored ayanamsas caelus accepts at runtime but does not export
 *  (`parseZodiac` consults `AYANAMSA_J2000` plus this private set). Kept as a
 *  local constant so the intake seam can promise exactly what the engine
 *  delivers; the acceptance tests pin both names.
 */
const STAR_ZODIAC_MODES = ["galcent_0sag", "true_citra"] as const;

const ZODIAC_MODES = new Set<string>([
	...Object.keys(AYANAMSA_J2000),
	...STAR_ZODIAC_MODES,
]);

const KNOWN_BODIES = new Set<string>([...BODIES, ...EXTRA_BODIES]);

function isZodiac(value: unknown): value is Zodiac {
	if (value === "tropical") return true;
	if (typeof value !== "string" || !value.startsWith("sidereal:")) {
		return false;
	}
	return ZODIAC_MODES.has(value.slice("sidereal:".length));
}

export const optionsSchema = z.object({
	houseSystem: z
		.custom<HouseSystem>(isHouseSystem, "not a known house system")
		.default("placidus")
		.transform(normalizeHouseSystem),
	zodiac: z
		.custom<Zodiac>(isZodiac, 'must be "tropical" or "sidereal:<ayanamsa>"')
		.default("tropical"),
	node: z.enum(["both", "mean", "true"]).default("both"),
	bodies: z
		.string()
		.default("")
		.transform((raw) =>
			raw
				.split(",")
				.map((b) => b.trim())
				.filter(Boolean),
		)
		.superRefine((ids, ctx) => {
			const unknown = ids.find((id) => !KNOWN_BODIES.has(id));
			if (unknown !== undefined) {
				ctx.addIssue({
					code: "custom",
					message: `unknown body: ${unknown}`,
				});
			}
		}),
});

export type OptionsFields = z.infer<typeof optionsSchema>;

export const optionsSuggestions: Record<string, string> = {
	houseSystem: `Valid: ${HOUSE_SYSTEMS.join(", ")}`,
	zodiac: `Valid: tropical | sidereal:${[...ZODIAC_MODES].join(" | sidereal:")}`,
	node: "Valid: both (default) | mean | true",
	bodies: `Valid: ${EXTRA_BODIES.join(", ")}`,
};

export function parseWith<T>(
	schema: z.ZodType<T>,
	input: Record<string, unknown>,
	suggestions: Record<string, string>,
): T {
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
	{ value: ["when", "place"], boolean: ["topocentric"] },
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
