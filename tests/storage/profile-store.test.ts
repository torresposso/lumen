import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AxiError } from "axi-sdk-js";
import type { ResolvedBirth } from "../../src/core/types";
import {
	defaultProfilesDir,
	defaultProfilesFile,
	ProfileStore,
} from "../../src/storage/profile-store";

function birth(overrides: Partial<ResolvedBirth> = {}): ResolvedBirth {
	return {
		jdUt: 2444068.0625,
		lat: 27.95,
		lon: -82.46,
		local: { year: 1990, month: 6, day: 10, hour: 14, minute: 30 },
		zone: "America/New_York",
		offsetMinutes: -240,
		dst: true,
		status: "ok",
		...overrides,
	};
}

describe("defaultProfilesDir", () => {
	afterEach(() => {
		delete process.env.LUMEN_PROFILES_DIR;
	});

	it("honors LUMEN_PROFILES_DIR when set", () => {
		process.env.LUMEN_PROFILES_DIR = "/tmp/lumen-custom-profiles";
		expect(defaultProfilesDir()).toBe("/tmp/lumen-custom-profiles");
	});

	it("falls back to ~/.config/lumen when unset", () => {
		expect(defaultProfilesDir()).toMatch(/\.config\/lumen$/);
	});

	it("defaultProfilesFile joins the lumen.db file name", () => {
		process.env.LUMEN_PROFILES_DIR = "/tmp/lumen-custom-profiles";
		expect(defaultProfilesFile()).toBe("/tmp/lumen-custom-profiles/lumen.db");
	});
});

describe("ProfileStore", () => {
	let dir: string;
	let dbPath: string;
	let store: ProfileStore;

	beforeEach(() => {
		dir = join(
			tmpdir(),
			`lumen-test-profiles-${Math.random().toString(36).slice(2)}`,
		);
		dbPath = join(dir, "lumen.db");
		store = new ProfileStore(dbPath);
	});

	afterEach(() => {
		store.close();
		if (existsSync(dir)) {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("creates the db file with 0600 permissions", () => {
		expect(existsSync(dbPath)).toBe(true);
		expect(statSync(dbPath).mode & 0o777).toBe(0o600);
	});

	it("missing db reads as an empty store", () => {
		expect(store.list()).toEqual([]);
		expect(store.get("erik")).toBeUndefined();
		expect(store.remove("erik")).toBe(false);
	});

	it("add and get round-trip the resolved birth", () => {
		store.add("erik", birth());
		const stored = store.get("erik");
		expect(stored?.id).toBe("erik");
		expect(stored?.birth.status).toBe("ok");
		expect(stored?.birth.local.year).toBe(1990);
		expect(stored?.birth.jdUt).toBe(2444068.0625);
		expect(store.get("kary")).toBeUndefined();
	});

	it("add is idempotent: keeps createdAt and refreshes updatedAt", async () => {
		const clock = { value: "2026-01-01T00:00:00.000Z" };
		store = new ProfileStore(dbPath, () => new Date(clock.value));
		const first = store.add("erik", birth({ lat: 27.95 }));
		clock.value = "2026-02-01T00:00:00.000Z";
		const second = store.add("erik", birth({ lat: 28.0 }));

		expect(second.createdAt).toBe(first.createdAt);
		expect(second.updatedAt).toBe("2026-02-01T00:00:00.000Z");
		expect(second.birth.lat).toBe(28.0);
	});

	it("list sorts by id and returns privacy-safe summaries", () => {
		store.add("zoe", birth());
		store.add("erik", birth());

		const summaries = store.list();
		expect(summaries.map((summary) => summary.id)).toEqual(["erik", "zoe"]);
		for (const summary of summaries) {
			expect(Object.keys(summary).sort()).toEqual([
				"birthStatus",
				"id",
				"updatedAt",
			]);
		}
	});

	it("remove deletes the profile and persists the change", () => {
		store.add("erik", birth());
		store.add("kary", birth());

		expect(store.remove("erik")).toBe(true);
		expect(store.remove("erik")).toBe(false);

		store.close();
		const reloaded = new ProfileStore(dbPath);
		expect(reloaded.get("erik")).toBeUndefined();
		expect(reloaded.get("kary")?.id).toBe("kary");
		reloaded.close();
	});

	it("reopens an existing lumen.db with user_version 1", () => {
		store.close();
		const reopened = new ProfileStore(dbPath);
		reopened.add("erik", birth());
		expect(reopened.get("erik")?.id).toBe("erik");
		reopened.close();
	});

	it("rejects a db with a newer user_version as PROFILE_ERROR", () => {
		store.close();
		const manual = new Database(dbPath);
		manual.exec("PRAGMA user_version = 99");
		manual.close();

		try {
			new ProfileStore(dbPath);
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(AxiError);
			expect((error as AxiError).code).toBe("PROFILE_ERROR");
			expect((error as AxiError).suggestions.join(" ")).toContain(
				"lumen profile",
			);
		}
	});
});
