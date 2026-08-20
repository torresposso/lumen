import { AxiError } from "axi-sdk-js";
import { parseWhen, parseWhere } from "./birth-input";
import { julianDayUt } from "./datetime";

export interface TransitTargetInput {
	dateTime: string;
	jdUt: number;
	place?: string;
	lat?: number;
	lon?: number;
}

export interface TransitInputLabels {
	when: string;
	where?: string;
}

export function parseTransitInput(
	flags: ReadonlyMap<string, string | null>,
	labels: TransitInputLabels,
): TransitTargetInput {
	const issues: string[] = [];
	const rawWhen = flags.get(labels.when);

	if (!rawWhen || rawWhen.trim() === "") {
		issues.push(`${labels.when} is required`);
	}

	const parsedWhen =
		rawWhen && rawWhen.trim() !== ""
			? parseWhen(rawWhen.trim(), issues, { when: labels.when })
			: undefined;

	let parsedWhere:
		| { birthLat?: number; birthLon?: number; birthPlace?: string }
		| undefined;
	if (labels.where) {
		const rawWhere = flags.get(labels.where);
		if (rawWhere && rawWhere.trim() !== "") {
			parsedWhere = parseWhere(rawWhere.trim(), issues, {
				where: labels.where,
			});
		}
	}

	if (issues.length > 0 || parsedWhen === undefined) {
		throw new AxiError("Invalid transit input", "VALIDATION_ERROR", issues);
	}

	return {
		dateTime: parsedWhen.canonicalDateTime,
		jdUt: julianDayUt(parsedWhen.local, parsedWhen.offsetMinutes),
		lat: parsedWhere?.birthLat,
		lon: parsedWhere?.birthLon,
		place: parsedWhere?.birthPlace,
	};
}
