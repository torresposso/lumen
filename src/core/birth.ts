import { toUT } from "caelus-birth";
import type { BirthClockFields, ResolvedBirth } from "./types";

export type { BirthClockFields, ResolvedBirth };

export interface BirthInputFields extends BirthClockFields {
	lat: number;
	lon: number;
	zone?: string;
}

export type BirthResolutionReason = "timezone" | "resolution";

/** Pure, framework-free birth resolution failure. The CLI intake layer maps
 *  this into an AxiError; core never imports CLI or validation frameworks. */
export class BirthResolutionError extends Error {
	readonly reason: BirthResolutionReason;

	constructor(message: string, reason: BirthResolutionReason = "resolution") {
		super(message);
		this.name = "BirthResolutionError";
		this.reason = reason;
	}
}

/**
 * Pure birth-time resolution: local wall clock + place -> UT Julian Day,
 * IANA zone and provenance status. No I/O happens here; `toUT` resolves
 * timezones from the coordinates and optional zone id supplied by the caller.
 */
export function resolveBirth(fields: BirthInputFields): ResolvedBirth {
	let result: ReturnType<typeof toUT>;
	try {
		result = toUT({
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
		const message = err instanceof Error ? err.message : String(err);
		if (message.includes("IANA time zone")) {
			throw new BirthResolutionError(
				`Invalid timezone: "${fields.zone}"`,
				"timezone",
			);
		}
		throw new BirthResolutionError(`Birth resolution failed: ${message}`);
	}

	return {
		jdUt: result.jdUt,
		lat: fields.lat,
		lon: fields.lon,
		local: {
			year: fields.year,
			month: fields.month,
			day: fields.day,
			hour: fields.hour,
			minute: fields.minute,
		},
		zone: result.zone,
		offsetMinutes: result.offsetMinutes,
		dst: result.dst,
		status: result.status,
	};
}
