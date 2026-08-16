import { describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CliContext } from "../../src/commands/client";
import { soulCommand } from "../../src/commands/soul";
import { ProfileStore } from "../../src/storage/client-store";
import { ConsultationStore } from "../../src/storage/consultation-store";

describe("soulCommand", () => {
	const setupContext = (): { context: CliContext; cleanup: () => void } => {
		const dir = mkdtempSync(join(tmpdir(), "lumen-soul-test-"));
		const profiles = new ProfileStore(join(dir, "profiles.json"));
		const consultations = new ConsultationStore(
			join(dir, "consultations.json"),
		);
		return {
			context: { profiles, consultations },
			cleanup: () => rmSync(dir, { recursive: true, force: true }),
		};
	};

	it("returns usage on --help or no args", async () => {
		const { context, cleanup } = setupContext();
		try {
			const usage = await soulCommand(["--help"], context);
			expect(typeof usage).toBe("string");
			expect(usage).toContain("lumen soul <client>");
		} finally {
			cleanup();
		}
	});

	it("computes baseline evolutionary soul reading from inline flags", async () => {
		const { context, cleanup } = setupContext();
		try {
			const result = (await soulCommand(
				[
					"--when",
					"1981-01-26T00:50",
					"--lat",
					"9.24",
					"--lon",
					"-74.75",
					"--zone",
					"America/Bogota",
				],
				context,
			)) as Record<string, unknown>;

			expect(result).toBeDefined();
			expect(result.soul).toBeDefined();
			const soul = result.soul as Record<string, unknown>;
			expect(soul.pluto).toBeDefined();
			expect(soul.ppp).toBeDefined();
			expect(soul.northNode).toBeDefined();
			expect(soul.southNode).toBeDefined();
			expect(soul.phase).toBeDefined();

			const mechanics = result.evolutionaryMechanics as Record<string, unknown>;
			expect(mechanics.pppActive).toBe(true);
			expect(mechanics.nodalRulers).toBeDefined();
			expect(result.help).toBeDefined();
		} finally {
			cleanup();
		}
	});

	it("computes soul reading for saved profile and supports --full", async () => {
		const { context, cleanup } = setupContext();
		try {
			context.profiles.add("silvia", {
				birth: {
					jdUt: 2444630.7430555555,
					lat: 9.24,
					lon: -74.75,
					local: { year: 1981, month: 1, day: 26, hour: 0, minute: 50 },
					zone: "America/Bogota",
					offsetMinutes: -300,
					dst: false,
					status: "ok",
				},
				options: {
					houseSystem: "placidus",
					zodiac: "tropical",
					node: "true",
					bodies: [],
					topocentric: false,
					draconic: false,
					eclipses: false,
					lots: false,
					stars: false,
					evolutionary: true,
				},
			});

			const result = (await soulCommand(
				["silvia", "--full"],
				context,
			)) as Record<string, unknown>;
			const soul = result.soul as Record<string, unknown>;
			expect(soul.client).toBe("silvia");

			const mechanics = result.evolutionaryMechanics as Record<string, unknown>;
			expect(mechanics.dispositorChains).toBeDefined();
			expect(mechanics.plutoAspects).toBeDefined();
			expect(mechanics.nodeAspects).toBeDefined();
		} finally {
			cleanup();
		}
	});
});
