import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AxiError } from "axi-sdk-js";
import { resolveNatalRequest } from "../../src/commands/client";
import {
	ClientStore,
	defaultClientsDir,
	defaultClientsFile,
} from "../../src/storage/client-store";

const STORE_FILE = "/tmp/lumen-client-store-test.json";

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
	rmSync("/tmp/lumen-client-store-parent-file", { force: true });
	delete process.env.LUMEN_PROFILES_DIR;
});

describe("defaultClientsDir", () => {
	test("honors LUMEN_PROFILES_DIR when set", () => {
		process.env.LUMEN_PROFILES_DIR = "/tmp/lumen-custom-profiles";
		expect(defaultClientsDir()).toBe("/tmp/lumen-custom-profiles");
	});

	test("falls back to ~/.config/lumen when unset", () => {
		expect(defaultClientsDir()).toMatch(/\.config\/lumen$/);
	});

	test("defaultClientsFile joins the clients.json file name", () => {
		process.env.LUMEN_PROFILES_DIR = "/tmp/lumen-custom-profiles";
		expect(defaultClientsFile()).toBe(
			"/tmp/lumen-custom-profiles/clients.json",
		);
	});
});

describe("ClientStore", () => {
	test("missing file reads as an empty store", () => {
		const store = new ClientStore(STORE_FILE);
		expect(store.list()).toEqual([]);
		expect(store.get("erik")).toBeUndefined();
		expect(store.remove("erik")).toBe(false);
	});

	test("get returns the stored client and undefined for unknown ids", async () => {
		const store = new ClientStore(STORE_FILE);
		store.add("erik", await request());

		const stored = store.get("erik");
		expect(stored?.id).toBe("erik");
		expect(stored?.birth.status).toBe("ok");
		expect(stored?.birth.local.year).toBe(1990);
		expect(store.get("kary")).toBeUndefined();
	});

	test("list sorts by id and returns privacy-safe summaries", async () => {
		const store = new ClientStore(STORE_FILE);
		store.add("zoe", await request());
		store.add("erik", await request());

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

	test("remove deletes the client and persists the change", async () => {
		const store = new ClientStore(STORE_FILE);
		store.add("erik", await request());
		store.add("kary", await request());

		expect(store.remove("erik")).toBe(true);
		expect(store.remove("erik")).toBe(false);

		const reloaded = new ClientStore(STORE_FILE);
		expect(reloaded.get("erik")).toBeUndefined();
		expect(reloaded.get("kary")?.id).toBe("kary");
	});

	test("wraps an empty profile file as PROFILE_ERROR", () => {
		mkdirSync("/tmp", { recursive: true });
		writeFileSync(STORE_FILE, "");
		const store = new ClientStore(STORE_FILE);
		try {
			store.list();
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(AxiError);
			expect((error as AxiError).code).toBe("PROFILE_ERROR");
		}
	});

	test("wraps unwritable profile paths as PROFILE_ERROR", async () => {
		const parentFile = "/tmp/lumen-client-store-parent-file";
		writeFileSync(parentFile, "not a directory");
		const store = new ClientStore(join(parentFile, "clients.json"));
		try {
			store.add("erik", await request());
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(AxiError);
			expect((error as AxiError).code).toBe("PROFILE_ERROR");
		}
	});
});
