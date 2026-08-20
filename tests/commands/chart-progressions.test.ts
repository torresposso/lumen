import { Database } from "bun:sqlite";
import { describe, expect, it } from "bun:test";
import { AxiError } from "axi-sdk-js";
import { CaelusEphemeris } from "../../src/adapters/ephemeris";
import type { CliContext } from "../../src/cli";
import { chartCommand } from "../../src/commands/chart";
import type { Profile } from "../../src/domain/model";
import { InMemoryProfileStore } from "../../src/storage/profile-store";

describe("chartCommand — lumen chart progressions <uuid>", () => {
	const ephemeris = new CaelusEphemeris();
	const sampleProfile = {
		name: "Erick",
		birthDateTime: "1981-01-26T00:50-05:00",
		birthPlace: "Magangué, Colombia",
		birthLat: 9.242,
		birthLon: -74.755,
		birthJdUt: 2444630.743056,
	};

	function createCtx(): CliContext {
		const store = new InMemoryProfileStore(new Database(":memory:"));
		store.add(sampleProfile);
		return {
			profiles: store,
			ephemeris,
		};
	}

	it("computes secondary progressions and Sol-Luna cycle at target date", async () => {
		const ctx = createCtx();
		const profile = ctx.profiles.list()[0] as Profile;

		const res = (await chartCommand(
			["progressions", profile.id, "--when", "2026-08-20T12:00-05:00"],
			ctx,
		)) as any;

		expect(res.progressions).toBeDefined();
		expect(res.progressions.target.ageYears).toBeCloseTo(45.56, 1);
		expect(res.progressions.solLunaPhase).toBeDefined();
		expect(typeof res.progressions.solLunaPhase.phase).toBe("string");
		expect(res.progressions.progressedBodies).toBeDefined();
		expect(res.progressions.progressedBodies.sun).toBeDefined();
		expect(res.progressions.progressedBodies.moon).toBeDefined();
		expect(res.progressions.aspectsToNatal).toBeDefined();
		expect(res.progressions.evolutionaryTriggers).toBeDefined();
	});

	it("throws NOT_FOUND for unknown uuid", async () => {
		const ctx = createCtx();
		expect(
			chartCommand(
				["progressions", "non-existent-uuid", "--when", "2026-08-20T12:00Z"],
				ctx,
			),
		).rejects.toThrow(AxiError);
	});
});
