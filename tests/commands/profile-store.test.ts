import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AxiError } from "axi-sdk-js";
import { resolveNatalRequest } from "../../src/commands/client";
import { ProfileStore } from "../../src/storage/client-store";

const STORE_FILE = "/tmp/lumen-profile-store-test.json";

async function request() {
	return resolveNatalRequest(
		{
			year: "1990",
			month: "6",
			day: "10",
			hour: "14",
			minute: "30",
			lat: "27.95",
			lon: "-82.46",
		},
		new Set(),
	);
}

afterEach(() => {
	rmSync(STORE_FILE, { force: true });
	rmSync(`${STORE_FILE}.tmp`, { force: true });
	rmSync("/tmp/lumen-profile-store-parent-file", { force: true });
});

describe("ProfileStore", () => {
	test("add is idempotent and preserves createdAt", async () => {
		const dates = [
			new Date("2026-01-01T00:00:00Z"),
			new Date("2026-01-02T00:00:00Z"),
		];
		let calls = 0;
		const store = new ProfileStore(
			STORE_FILE,
			() => dates[calls++] ?? new Date(),
		);

		const first = store.add("erik", await request());
		const second = store.add("erik", await request());

		expect(first.createdAt).toBe("2026-01-01T00:00:00.000Z");
		expect(second.createdAt).toBe(first.createdAt);
		expect(second.updatedAt).toBe("2026-01-02T00:00:00.000Z");
		expect(store.list()).toEqual([
			{ id: "erik", birthStatus: "ok", updatedAt: "2026-01-02T00:00:00.000Z" },
		]);
	});

	test("wraps syntactically corrupt JSON as PROFILE_ERROR", () => {
		mkdirSync("/tmp", { recursive: true });
		writeFileSync(STORE_FILE, "{bad json");
		const store = new ProfileStore(STORE_FILE);
		try {
			store.list();
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(AxiError);
			expect((error as AxiError).code).toBe("PROFILE_ERROR");
		}
	});

	test("wraps semantically corrupt profile files as PROFILE_ERROR", () => {
		mkdirSync("/tmp", { recursive: true });
		for (const contents of [
			'{"version":1,"profiles":null}',
			'{"version":1,"profiles":{"erik":{"id":"erik"}}}',
		]) {
			writeFileSync(STORE_FILE, contents);
			const store = new ProfileStore(STORE_FILE);
			try {
				store.list();
				expect.unreachable();
			} catch (error) {
				expect(error).toBeInstanceOf(AxiError);
				expect((error as AxiError).code).toBe("PROFILE_ERROR");
			}
		}
	});

	test("wraps unwritable profile paths as PROFILE_ERROR", async () => {
		const parentFile = "/tmp/lumen-profile-store-parent-file";
		writeFileSync(parentFile, "not a directory");
		const store = new ProfileStore(join(parentFile, "profiles.json"));
		try {
			store.add("erik", await request());
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(AxiError);
			expect((error as AxiError).code).toBe("PROFILE_ERROR");
		}
	});

	test("creates profile files with owner-only permissions", async () => {
		const store = new ProfileStore(STORE_FILE);
		store.add("erik", await request());
		if (process.platform !== "win32") {
			expect(statSync(STORE_FILE).mode & 0o777).toBe(0o600);
		}
	});

	test("repairs permissions on existing profile files when possible", async () => {
		mkdirSync("/tmp", { recursive: true });
		const stored = await request();
		const tempStore = new ProfileStore(STORE_FILE);
		tempStore.add("erik", stored);
		chmodSync(STORE_FILE, 0o644);

		const store = new ProfileStore(STORE_FILE);
		store.list();
		if (process.platform !== "win32") {
			expect(statSync(STORE_FILE).mode & 0o777).toBe(0o600);
		}
	});
});
