import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { AxiError } from "axi-sdk-js";
import { CaelusEphemeris } from "../../src/adapters/ephemeris";
import { profileCommand } from "../../src/commands/profile";
import type { ToonProfile } from "../../src/domain/toon";
import { InMemoryProfileStore } from "../../src/storage/profile-store";

describe("profileCommand — lumen profile add | list | get | delete", () => {
	const ephemeris = new CaelusEphemeris();

	test("profile add creates and returns toon-formatted profile", async () => {
		const store = new InMemoryProfileStore(new Database(":memory:"));
		const result = await profileCommand(
			[
				"add",
				"--when",
				"1990-06-10T14:30-04:00",
				"--where",
				"27.9506, -82.4572, Tampa, Florida, USA",
				"--name",
				"tampa-test",
			],
			{ profiles: store, ephemeris },
		);

		expect(result).toMatchObject({
			status: "added",
			name: "tampa-test",
			birthDateTime: "1990-06-10T14:30-04:00",
			birthPlace: "Tampa, Florida, USA",
			birthLat: 27.9506,
			birthLon: -82.4572,
		});

		const resObj = result as ToonProfile;
		expect(typeof resObj.id).toBe("string");
		expect(resObj.birthJdUt).toBeCloseTo(2448053.270833, 5);
	});

	test("profile add deduplicates on birth identity", async () => {
		const store = new InMemoryProfileStore(new Database(":memory:"));
		const args = [
			"add",
			"--when",
			"1990-06-10T14:30-04:00",
			"--where",
			"27.9506, -82.4572, Tampa, Florida, USA",
		];

		const res1 = (await profileCommand(args, {
			profiles: store,
			ephemeris,
		})) as { status: string; id: string };
		expect(res1.status).toBe("added");

		const res2 = (await profileCommand([...args, "--name", "different-name"], {
			profiles: store,
			ephemeris,
		})) as { status: string; id: string };

		expect(res2.status).toBe("already exists");
		expect(res2.id).toBe(res1.id);
	});

	test("profile list returns empty-state hint when empty", async () => {
		const store = new InMemoryProfileStore(new Database(":memory:"));
		const result = await profileCommand(["list"], {
			profiles: store,
			ephemeris,
		});

		expect(result).toMatchObject({
			profiles: [],
		});
		expect((result as { help: string[] }).help[0]).toContain(
			"lumen profile add",
		);
	});

	test("profile list returns formatted profiles when present", async () => {
		const store = new InMemoryProfileStore(new Database(":memory:"));
		store.add({
			name: "Test Person",
			birthPlace: "Bogota, Colombia",
			birthDateTime: "1995-10-15T08:00-05:00",
			birthLat: 4.711,
			birthLon: -74.0721,
			birthJdUt: 2450005.041667,
		});

		const result = (await profileCommand(["list"], {
			profiles: store,
			ephemeris,
		})) as { profiles: ToonProfile[] };

		expect(result.profiles).toHaveLength(1);
		expect(result.profiles[0]?.name).toBe("Test Person");
		expect(result.profiles[0]?.birthPlace).toBe("Bogota, Colombia");
	});

	test("profile get returns single profile by id", async () => {
		const store = new InMemoryProfileStore(new Database(":memory:"));
		const { profile } = store.add({
			name: "Test Person",
			birthPlace: "Bogota, Colombia",
			birthDateTime: "1995-10-15T08:00-05:00",
			birthLat: 4.711,
			birthLon: -74.0721,
			birthJdUt: 2450005.041667,
		});

		const result = (await profileCommand(["get", profile.id], {
			profiles: store,
			ephemeris,
		})) as ToonProfile;

		expect(result.id).toBe(profile.id);
		expect(result.name).toBe("Test Person");
		expect(result.birthDateTime).toBe("1995-10-15T08:00-05:00");
	});

	test("profile get throws NOT_FOUND for unknown id", async () => {
		const store = new InMemoryProfileStore(new Database(":memory:"));
		let error: unknown;
		try {
			await profileCommand(["get", "unknown-uuid"], {
				profiles: store,
				ephemeris,
			});
		} catch (e) {
			error = e;
		}

		expect(error).toBeInstanceOf(AxiError);
		const axiErr = error as AxiError;
		expect(axiErr.code).toBe("NOT_FOUND");
		expect(axiErr.suggestions[0]).toContain("lumen profile list");
	});

	test("profile delete removes profile and returns deleted status", async () => {
		const store = new InMemoryProfileStore(new Database(":memory:"));
		const { profile } = store.add({
			name: "To Delete",
			birthPlace: "Bogota, Colombia",
			birthDateTime: "1995-10-15T08:00-05:00",
			birthLat: 4.711,
			birthLon: -74.0721,
			birthJdUt: 2450005.041667,
		});

		const result = await profileCommand(["delete", profile.id], {
			profiles: store,
			ephemeris,
		});

		expect(result).toEqual({ profile: profile.id, status: "deleted" });
		expect(store.get(profile.id)).toBeUndefined();
	});

	test("profile delete throws NOT_FOUND for unknown id", async () => {
		const store = new InMemoryProfileStore(new Database(":memory:"));
		let error: unknown;
		try {
			await profileCommand(["delete", "unknown-uuid"], {
				profiles: store,
				ephemeris,
			});
		} catch (e) {
			error = e;
		}

		expect(error).toBeInstanceOf(AxiError);
		const axiErr = error as AxiError;
		expect(axiErr.code).toBe("NOT_FOUND");
	});

	test("returns usage with --help", async () => {
		const store = new InMemoryProfileStore(new Database(":memory:"));
		const usage = await profileCommand(["--help"], {
			profiles: store,
			ephemeris,
		});
		expect(typeof usage).toBe("string");
		expect(usage as string).toContain("Manage local birth profiles.");

		const addUsage = await profileCommand(["add", "--help"], {
			profiles: store,
			ephemeris,
		});
		expect(typeof addUsage).toBe("string");
		expect(addUsage as string).toContain("Register a birth profile.");
	});
});
