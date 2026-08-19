import { detectPatterns as detectCaelusPatterns } from "caelus";

export interface AspectPattern {
	type: string;
	bodies: string[];
	apex?: string | null;
	sign?: string | null;
	house?: number | null;
	element?: string;
	modality?: string;
	orb?: number;
}

export interface AstrologicalSignature {
	hemispheres: {
		eastern: number;
		western: number;
		northern: number;
		southern: number;
	};
	quadrants: {
		q1: number;
		q2: number;
		q3: number;
		q4: number;
	};
	elements: {
		fire: number;
		earth: number;
		air: number;
		water: number;
	};
	modalities: {
		cardinal: number;
		fixed: number;
		mutable: number;
	};
}

export const SIGN_ELEMENTS: Record<string, string> = {
	Aries: "fire",
	Leo: "fire",
	Sagittarius: "fire",
	Taurus: "earth",
	Virgo: "earth",
	Capricorn: "earth",
	Gemini: "air",
	Libra: "air",
	Aquarius: "air",
	Cancer: "water",
	Scorpio: "water",
	Pisces: "water",
};

export const SIGN_MODALITIES: Record<string, string> = {
	Aries: "cardinal",
	Cancer: "cardinal",
	Libra: "cardinal",
	Capricorn: "cardinal",
	Taurus: "fixed",
	Leo: "fixed",
	Scorpio: "fixed",
	Aquarius: "fixed",
	Gemini: "mutable",
	Virgo: "mutable",
	Sagittarius: "mutable",
	Pisces: "mutable",
};

export function detectAspectPatterns(
	bodies: Record<string, { lon: number; sign: string; house: number }>,
): AspectPattern[] {
	const bodyMap: Record<string, { lon: number; house?: number | null }> = {};
	for (const [id, body] of Object.entries(bodies)) {
		if (body) {
			bodyMap[id] = { lon: body.lon, house: body.house };
		}
	}

	const detected = detectCaelusPatterns({
		bodies: bodyMap,
	} as Parameters<typeof detectCaelusPatterns>[0]);
	const patterns: AspectPattern[] = [];

	for (const pattern of detected) {
		const base = {
			bodies: [...pattern.bodies].sort(),
			apex: pattern.apex ?? null,
			sign: pattern.sign ?? null,
			house: pattern.house ?? null,
			orb:
				pattern.orb !== undefined ? Number(pattern.orb.toFixed(4)) : undefined,
		};

		switch (pattern.kind) {
			case "grand_trine": {
				const sign = pattern.bodies[0]
					? bodies[pattern.bodies[0]]?.sign
					: undefined;
				patterns.push({
					...base,
					type: "grand_trine",
					element: sign ? SIGN_ELEMENTS[sign] : undefined,
				});
				break;
			}
			case "t_square": {
				const apexSign = pattern.apex ? bodies[pattern.apex]?.sign : undefined;
				patterns.push({
					...base,
					type: "t_square",
					modality: apexSign ? SIGN_MODALITIES[apexSign] : undefined,
				});
				break;
			}
			case "grand_cross":
				patterns.push({ ...base, type: "grand_cross" });
				break;
			case "yod":
				patterns.push({ ...base, type: "yod" });
				break;
			case "kite":
				patterns.push({ ...base, type: "kite" });
				break;
			case "mystic_rectangle":
				patterns.push({ ...base, type: "mystic_rectangle" });
				break;
			case "stellium_sign":
				patterns.push({
					...base,
					type: "stellium",
					element: pattern.sign ? SIGN_ELEMENTS[pattern.sign] : undefined,
					modality: pattern.sign ? SIGN_MODALITIES[pattern.sign] : undefined,
				});
				break;
			case "stellium_house":
				patterns.push({ ...base, type: "stellium_house" });
				break;
		}
	}

	return patterns;
}

export function computeSignature(
	bodies: Record<string, { sign: string; house: number }>,
): AstrologicalSignature {
	const hemispheres = { eastern: 0, western: 0, northern: 0, southern: 0 };
	const quadrants = { q1: 0, q2: 0, q3: 0, q4: 0 };
	const elements = { fire: 0, earth: 0, air: 0, water: 0 };
	const modalities = { cardinal: 0, fixed: 0, mutable: 0 };

	const planetsOnly = Object.entries(bodies).filter(
		([id]) => id !== "true_node" && id !== "mean_node" && id !== "chiron",
	);

	for (const [_, body] of planetsOnly) {
		const elem = SIGN_ELEMENTS[body.sign] as keyof typeof elements;
		if (elem) elements[elem]++;

		const mod = SIGN_MODALITIES[body.sign] as keyof typeof modalities;
		if (mod) modalities[mod]++;

		if (body.house >= 1 && body.house <= 3) quadrants.q1++;
		else if (body.house >= 4 && body.house <= 6) quadrants.q2++;
		else if (body.house >= 7 && body.house <= 9) quadrants.q3++;
		else if (body.house >= 10 && body.house <= 12) quadrants.q4++;

		if (body.house >= 10 || body.house <= 3) hemispheres.eastern++;
		else hemispheres.western++;

		if (body.house >= 7 && body.house <= 12) hemispheres.northern++;
		else hemispheres.southern++;
	}

	return { hemispheres, quadrants, elements, modalities };
}
