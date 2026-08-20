import { Database } from "bun:sqlite";
import { describe, expect, it } from "bun:test";
import { AxiError } from "axi-sdk-js";
import { CaelusEphemeris } from "../../src/adapters/ephemeris";
import type { CliContext } from "../../src/cli";
import { chartCommand } from "../../src/commands/chart";
import type { Profile } from "../../src/domain/model";
import { InMemoryProfileStore } from "../../src/storage/profile-store";

describe("chartCommand — lumen chart synthesis <uuid>", () => {
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

	it("computes evolutionary synthesis for valid profile and --when", async () => {
		const ctx = createCtx();
		const profile = ctx.profiles.list()[0] as Profile;

		const res = (await chartCommand(
			["synthesis", profile.id, "--when", "2026-08-20T12:00-05:00"],
			ctx,
		)) as {
			synthesis: {
				profile: { id: string };
				targetMoment: { when: string; jdUt: number };
				karmicRoot: unknown;
				soulClock: unknown;
				cosmicTriggers: unknown;
				evolutionaryDynamics: {
					skippedStepActivations: unknown[];
					plutoNodePressure: unknown[];
					phaseContextGuidance: string;
				};
				method: string;
			};
		};

		expect(res.synthesis).toBeDefined();
		expect(res.synthesis.profile.id).toBe(profile.id);
		expect(res.synthesis.targetMoment.when).toBe("2026-08-20T12:00-05:00");
		expect(res.synthesis.karmicRoot).toBeDefined();
		expect(res.synthesis.soulClock).toBeDefined();
		expect(res.synthesis.cosmicTriggers).toBeDefined();
		expect(res.synthesis.evolutionaryDynamics).toBeDefined();
		expect(
			Array.isArray(res.synthesis.evolutionaryDynamics.skippedStepActivations),
		).toBe(true);
		expect(
			Array.isArray(res.synthesis.evolutionaryDynamics.plutoNodePressure),
		).toBe(true);
		expect(typeof res.synthesis.evolutionaryDynamics.phaseContextGuidance).toBe(
			"string",
		);
		expect(res.synthesis.method).toBe(
			"JWGEA 3-Layer Soul Stack Evolutionary Synthesis",
		);
	});

	it("computes synthesis with optional --where", async () => {
		const ctx = createCtx();
		const profile = ctx.profiles.list()[0] as Profile;

		const res = (await chartCommand(
			[
				"synthesis",
				profile.id,
				"--when",
				"2026-08-20T12:00-05:00",
				"--where",
				"40.7128, -74.0060, New York, NY",
			],
			ctx,
		)) as {
			synthesis: {
				targetMoment: { where?: string };
			};
		};

		expect(res.synthesis.targetMoment.where).toBe("New York, NY");
	});

	it("throws NOT_FOUND for unknown uuid", async () => {
		const ctx = createCtx();
		expect(
			chartCommand(
				[
					"synthesis",
					"00000000-0000-0000-0000-000000000000",
					"--when",
					"2026-08-20T12:00-05:00",
				],
				ctx,
			),
		).rejects.toThrow(AxiError);
	});

	it("throws VALIDATION_ERROR when missing --when flag", async () => {
		const ctx = createCtx();
		const profile = ctx.profiles.list()[0] as Profile;

		expect(chartCommand(["synthesis", profile.id], ctx)).rejects.toThrow(
			AxiError,
		);
	});

	it("throws VALIDATION_ERROR when missing positional uuid", async () => {
		const ctx = createCtx();

		expect(
			chartCommand(["synthesis", "--when", "2026-08-20T12:00-05:00"], ctx),
		).rejects.toThrow(AxiError);
	});
});
