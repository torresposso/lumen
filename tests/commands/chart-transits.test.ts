import { Database } from "bun:sqlite";
import { describe, expect, it } from "bun:test";
import { AxiError } from "axi-sdk-js";
import { CaelusEphemeris } from "../../src/adapters/ephemeris";
import type { CliContext } from "../../src/cli";
import { chartCommand } from "../../src/commands/chart";
import type { Profile } from "../../src/domain/model";
import { InMemoryProfileStore } from "../../src/storage/profile-store";

describe("chartCommand — lumen chart transits <uuid>", () => {
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
			["transits", profile.id, "--when", "2026-08-20T12:00Z"],
			ctx,
		)) as any;

		expect(res.transits).toBeDefined();
		expect(res.transits.natal.id).toBe(profile.id);
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
				profile.id,
				"--when",
				"2026-08-20T12:00-05:00",
				"--where",
				"40.7128, -74.0060, New York, NY",
			],
			ctx,
		)) as any;

		expect(res.transits.transitAngles).toBeDefined();
		expect(res.transits.transitAngles?.asc).toBeDefined();
		expect(res.transits.transitCusps).toBeDefined();
		expect(res.transits.transitCusps?.length).toBe(12);
		expect(res.transits.houseSystem).toBe("porphyry");
	});

	it("throws NOT_FOUND for unknown uuid", async () => {
		const ctx = createCtx();
		expect(
			chartCommand(
				["transits", "non-existent-uuid", "--when", "2026-08-20T12:00Z"],
				ctx,
			),
		).rejects.toThrow(AxiError);
	});
});
