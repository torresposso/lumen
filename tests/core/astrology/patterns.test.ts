import { describe, expect, test } from "bun:test";
import { computeSignature } from "../../../src/core/astrology/patterns";

describe("Patterns and Signature calculations", () => {
	test("calculates quadrant and hemisphere balance", () => {
		const bodies = {
			sun: { sign: "Aries", house: 1, lon: 10 },
			moon: { sign: "Taurus", house: 2, lon: 40 },
			mars: { sign: "Gemini", house: 7, lon: 70 },
		};

		const signature = computeSignature(bodies);
		expect(signature.elements.fire).toBe(1);
		expect(signature.elements.earth).toBe(1);
		expect(signature.elements.air).toBe(1);
		expect(signature.quadrants.q1).toBe(2);
		expect(signature.quadrants.q3).toBe(1);
	});
});
