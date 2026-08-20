import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { AxiError } from "axi-sdk-js";
import { CaelusEphemeris } from "../../src/adapters/ephemeris";
import { chartCommand } from "../../src/commands/chart";
import { InMemoryProfileStore } from "../../src/storage/profile-store";

describe("chartCommand — lumen chart natal <uuid>", () => {
	const ephemeris = new CaelusEphemeris();

	test("returns full chart output for a valid profile", async () => {
		const store = new InMemoryProfileStore(new Database(":memory:"));
		const { profile } = store.add({
			name: "Tampa Test",
			birthPlace: "Tampa, Florida, USA",
			birthDateTime: "1990-06-10T14:30-04:00",
			birthLat: 27.9506,
			birthLon: -82.4572,
			birthJdUt: 2448053.270833,
		});

		const result = await chartCommand(["natal", profile.id], {
			profiles: store,
			ephemeris,
		});
		expect(typeof result).toBe("object");
		expect("chart" in (result as object)).toBe(true);

		const chart = (
			result as {
				chart: { houseSystem: string; zodiac: string; pluto: { sign: string } };
			}
		).chart;
		expect(chart.houseSystem).toBe("porphyry");
		expect(chart.zodiac).toBe("tropical");
		expect(chart.pluto.sign).toBe("Scorpio");
	});

	test("throws NOT_FOUND for a nonexistent profile id", async () => {
		const store = new InMemoryProfileStore(new Database(":memory:"));
		const nonexistentId = "00000000-0000-0000-0000-000000000000";

		let error: unknown;
		try {
			await chartCommand(["natal", nonexistentId], {
				profiles: store,
				ephemeris,
			});
		} catch (e) {
			error = e;
		}

		expect(error).toBeInstanceOf(AxiError);
		const axiErr = error as AxiError;
		expect(axiErr.code).toBe("NOT_FOUND");
		expect(axiErr.message).toContain(nonexistentId);
		expect(axiErr.suggestions[0]).toContain("lumen profile list");
	});

	test("throws VALIDATION_ERROR when missing the profile id argument", async () => {
		const store = new InMemoryProfileStore(new Database(":memory:"));

		let error: unknown;
		try {
			await chartCommand(["natal"], { profiles: store, ephemeris });
		} catch (e) {
			error = e;
		}

		expect(error).toBeInstanceOf(AxiError);
		const axiErr = error as AxiError;
		expect(axiErr.code).toBe("VALIDATION_ERROR");
	});

	test("returns natalInterpretation when --interpret flag is passed", async () => {
		const store = new InMemoryProfileStore(new Database(":memory:"));
		const { profile } = store.add({
			name: "Tampa Test",
			birthPlace: "Tampa, Florida, USA",
			birthDateTime: "1990-06-10T14:30-04:00",
			birthLat: 27.9506,
			birthLon: -82.4572,
			birthJdUt: 2448053.270833,
		});

		const result = (await chartCommand(["natal", profile.id, "--interpret"], {
			profiles: store,
			ephemeris,
		})) as {
			natalInterpretation: {
				profile: { id: string; name: string | null };
				karmicRoot: {
					pluto: {
						sign: string;
						house: number;
						degree: number;
						isRetrograde: boolean;
						polarityPoint: { sign: string; house: number; degree: number };
					};
					nodalAxis: {
						northNode: {
							sign: string;
							house: number;
							ruler: string;
							rulerLocation: { sign: string; house: number };
						};
						southNode: {
							sign: string;
							house: number;
							ruler: string;
							rulerLocation: { sign: string; house: number };
						};
					};
					skippedSteps: Array<{
						planet: string;
						sign: string;
						house: number;
						squareToNode: "both" | "north" | "south";
						resolutionNode: "north" | "south";
					}>;
					dispositorDynamics: {
						dominantLoop: string[];
						finalDispositors: string[];
					};
					prenatalEclipses: {
						solar: { sign: string; house: number; formatted: string };
						lunar: { sign: string; house: number; formatted: string };
					};
					soulLots: {
						lotOfFortune: { sign: string; house: number; formatted: string };
						lotOfSpirit: { sign: string; house: number; formatted: string };
					};
				};
			};
		};

		expect(result.natalInterpretation).toBeDefined();
		expect(result.natalInterpretation.profile.id).toBe(profile.id);
		expect(result.natalInterpretation.karmicRoot.pluto.sign).toBe("Scorpio");
		expect(result.natalInterpretation.karmicRoot.pluto.polarityPoint.sign).toBe(
			"Taurus",
		);
		expect(result.natalInterpretation.karmicRoot.nodalAxis.northNode.sign).toBe(
			"Aquarius",
		);
		expect(result.natalInterpretation.karmicRoot.nodalAxis.southNode.sign).toBe(
			"Leo",
		);
		expect(
			result.natalInterpretation.karmicRoot.prenatalEclipses.solar.formatted,
		).toBeDefined();
		expect(
			result.natalInterpretation.karmicRoot.soulLots.lotOfFortune.formatted,
		).toBeDefined();
	});

	test("returns usage with --help", async () => {
		const store = new InMemoryProfileStore(new Database(":memory:"));
		const usage = await chartCommand(["--help"], {
			profiles: store,
			ephemeris,
		});
		expect(typeof usage).toBe("string");
		expect(usage as string).toContain("lumen chart natal <uuid>");

		const natalUsage = await chartCommand(["natal", "--help"], {
			profiles: store,
			ephemeris,
		});
		expect(typeof natalUsage).toBe("string");
		expect(natalUsage as string).toContain("Porphyry houses");
	});
});
