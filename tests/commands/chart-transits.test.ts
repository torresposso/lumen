import { Database } from "bun:sqlite";
import { describe, expect, it } from "bun:test";
import { AxiError } from "axi-sdk-js";
import { CaelusEphemeris } from "../../src/adapters/ephemeris";
import type { CliContext } from "../../src/cli";
import { chartCommand } from "../../src/commands/chart";
import type { Profile } from "../../src/domain/model";
import { InMemoryProfileStore } from "../../src/storage/profile-store";

describe("chartCommand — lumen chart transits <name>", () => {
	const ephemeris = new CaelusEphemeris();
	const sampleProfile = {
		name: "Erick",
		birthDateTime: "1990-06-10T14:30-04:00",
		birthPlace: "Caracas, Venezuela",
		birthLat: 10.4806,
		birthLon: -66.9036,
		birthJdUt: 2448053.270833,
	};

	function createCtx(): CliContext {
		const store = new InMemoryProfileStore(new Database(":memory:"));
		store.add(sampleProfile);
		return {
			profiles: store,
			ephemeris,
		};
	}

	it("computes transits output for valid profile and --when", async () => {
		const ctx = createCtx();
		const profile = ctx.profiles.list()[0] as Profile;

		const res = (await chartCommand(
			["transits", profile.name, "--when", "2026-08-20T12:00Z"],
			ctx,
		)) as {
			transits: {
				birth: { id: string };
				target: { dateTime: string };
				transitingBodies: { pluto: unknown };
				aspectsToNatal: unknown;
				evolutionaryTriggers: unknown;
			};
		};

		expect(res.transits).toBeDefined();
		expect(res.transits.birth.id).toBe(profile.id);
		expect(res.transits.target.dateTime).toBe("2026-08-20T12:00Z");
		expect(res.transits.transitingBodies).toBeDefined();
		expect(res.transits.transitingBodies.pluto).toBeDefined();
		expect(res.transits.aspectsToNatal).toBeDefined();
		expect(res.transits.evolutionaryTriggers).toBeDefined();
	});

	it("computes transit local houses and angles when --where is provided", async () => {
		const ctx = createCtx();
		const profile = ctx.profiles.list()[0] as Profile;

		const res = (await chartCommand(
			[
				"transits",
				profile.name,
				"--when",
				"2026-08-20T12:00-05:00",
				"--where",
				"40.7128, -74.0060, New York, NY",
			],
			ctx,
		)) as {
			transits: {
				transitAngles?: { asc: unknown };
				transitCusps?: unknown[];
				meta: { houseSystem?: string };
			};
		};

		expect(res.transits.transitAngles).toBeDefined();
		expect(res.transits.transitAngles?.asc).toBeDefined();
		expect(res.transits.transitCusps).toBeDefined();
		expect(res.transits.transitCusps?.length).toBe(12);
		expect(res.transits.meta.houseSystem).toBe("porphyry");
	});

	it("computes transitsInterpretation when --interpret flag is provided", async () => {
		const ctx = createCtx();
		const profile = ctx.profiles.list()[0] as Profile;

		const res = (await chartCommand(
			["transits", profile.name, "--when", "2026-08-20T12:00Z", "--interpret"],
			ctx,
		)) as {
			transitsInterpretation: {
				target: { dateTime: string; jdUt: number };
				natal: { id: string };
				activeTriggers: Array<{
					transitingBody: string;
					natalPoint: string;
					aspect: string;
					orb: number;
					isApplying: boolean;
					transitingHouse: number;
				}>;
				outOfBoundsTransits: Array<{
					planet: string;
					declination: number;
					status: string;
				}>;
			};
		};

		expect(res.transitsInterpretation).toBeDefined();
		expect(res.transitsInterpretation.natal.id).toBe(profile.id);
		expect(res.transitsInterpretation.target.dateTime).toBe(
			"2026-08-20T12:00Z",
		);
		expect(Array.isArray(res.transitsInterpretation.activeTriggers)).toBe(true);
		expect(Array.isArray(res.transitsInterpretation.outOfBoundsTransits)).toBe(
			true,
		);
	});

	it("throws NOT_FOUND for unknown name", async () => {
		const ctx = createCtx();
		expect(
			chartCommand(
				["transits", "non-existent-name", "--when", "2026-08-20T12:00Z"],
				ctx,
			),
		).rejects.toThrow(AxiError);
	});
});
