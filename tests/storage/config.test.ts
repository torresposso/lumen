import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveNatalRequest } from "../../src/commands/intake";
import {
	type ChartConfig,
	ConfigStore,
	defaultConfigFile,
} from "../../src/storage/config";

const BIRTH_VALUES = {
	year: "1981",
	month: "1",
	day: "26",
	hour: "0",
	minute: "50",
	lat: "9.15",
	lon: "-74.75",
};

/** Missing file (contents undefined) behaves exactly like an empty config. */
function storeWith(json: unknown): {
	store: ConfigStore;
	file: string;
	cleanup: () => void;
} {
	const dir = mkdtempSync(join(tmpdir(), "lumen-config-test-"));
	const file = join(dir, "config.json");
	if (json !== undefined) {
		writeFileSync(file, typeof json === "string" ? json : JSON.stringify(json));
	}
	return {
		store: new ConfigStore(file),
		file,
		cleanup: () => rmSync(dir, { recursive: true, force: true }),
	};
}

function silenceWarnings(load: () => ChartConfig): ChartConfig {
	const warn = console.warn;
	console.warn = () => {};
	try {
		return load();
	} finally {
		console.warn = warn;
	}
}

async function requestOptions(
	config: ConfigStore | undefined,
	flags?: { houseSystem?: string; node?: string },
) {
	const values: Record<string, string> = { ...BIRTH_VALUES };
	if (flags?.houseSystem !== undefined)
		values["house-system"] = flags.houseSystem;
	if (flags?.node !== undefined) values.node = flags.node;
	return (await resolveNatalRequest(values, new Set(), undefined, config))
		.options;
}

describe("ConfigStore", () => {
	test("missing config file reads as empty (schema defaults apply)", () => {
		const { store, cleanup } = storeWith(undefined);
		try {
			expect(store.load()).toEqual({});
		} finally {
			cleanup();
		}
	});

	test("unparseable JSON reads as empty and never throws", () => {
		const { store, cleanup } = storeWith("{ this is not json");
		try {
			expect(silenceWarnings(() => store.load())).toEqual({});
		} finally {
			cleanup();
		}
	});

	test("non-object JSON reads as empty", () => {
		const { store, cleanup } = storeWith(["whole_sign", "mean"]);
		try {
			expect(silenceWarnings(() => store.load())).toEqual({});
		} finally {
			cleanup();
		}
	});

	test("individual invalid values are dropped, valid ones survive", () => {
		const badSystem = storeWith({ houseSystem: "bogus", node: "mean" });
		const badNode = storeWith({ houseSystem: "whole_sign", node: "chiron" });
		const allValid = storeWith({ houseSystem: "whole_sign", node: "true" });
		try {
			expect(silenceWarnings(() => badSystem.store.load())).toEqual({
				node: "mean",
			});
			expect(silenceWarnings(() => badNode.store.load())).toEqual({
				houseSystem: "whole_sign",
			});
			expect(allValid.store.load()).toEqual({
				houseSystem: "whole_sign",
				node: "true",
			});
		} finally {
			badSystem.cleanup();
			badNode.cleanup();
			allValid.cleanup();
		}
	});

	test("load enforces 0600 permissions on the existing file", () => {
		const { store, file, cleanup } = storeWith({ houseSystem: "equal" });
		try {
			store.load();
			expect(statSync(file).mode & 0o777).toBe(0o600);
		} finally {
			cleanup();
		}
	});

	test("defaultConfigFile points at config.json in the profiles dir", () => {
		const dir = mkdtempSync(join(tmpdir(), "lumen-config-dir-"));
		try {
			const previous = process.env.LUMEN_PROFILES_DIR;
			process.env.LUMEN_PROFILES_DIR = dir;
			try {
				expect(defaultConfigFile()).toBe(join(dir, "config.json"));
			} finally {
				if (previous === undefined) delete process.env.LUMEN_PROFILES_DIR;
				else process.env.LUMEN_PROFILES_DIR = previous;
			}
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe("config precedence (flag > config > zod-default)", () => {
	test("schema defaults apply with no flag and no config", async () => {
		const options = await requestOptions(undefined);
		expect(options.houseSystem).toBe("placidus");
		expect(options.node).toBe("both");
	});

	test("config values override schema defaults", async () => {
		const { store, cleanup } = storeWith({
			houseSystem: "whole_sign",
			node: "mean",
		});
		try {
			const options = await requestOptions(store);
			expect(options.houseSystem).toBe("whole_sign");
			expect(options.node).toBe("mean");
		} finally {
			cleanup();
		}
	});

	test("an explicit flag always wins over config", async () => {
		const { store, cleanup } = storeWith({
			houseSystem: "whole_sign",
			node: "mean",
		});
		try {
			const options = await requestOptions(store, {
				houseSystem: "equal",
				node: "true",
			});
			expect(options.houseSystem).toBe("equal");
			expect(options.node).toBe("true");
		} finally {
			cleanup();
		}
	});
});
