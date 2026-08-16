import { chmodSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeHouseSystem } from "caelus";
import { defaultProfilesDir } from "./profile-store";

/**
 * Global chart-option defaults ($XDG config, ticket 05), the layer between
 * the command-line flag and the schema default: flag > config > zod-default.
 * Lives in `~/.config/lumen/config.json` (same dir as the stores). lumen only
 * ever writes nothing here; on read it enforces `0600` best-effort, mirroring
 * the profile store's privacy posture.
 *
 * Reading is tolerant on purpose: a missing or unparseable file yields an
 * empty config (schema defaults apply) and never breaks startup.
 */
export interface ChartConfig {
	houseSystem?: string;
}

export function defaultConfigFile(): string {
	return join(defaultProfilesDir(), "config.json");
}

export class ConfigStore {
	constructor(private readonly file: string = defaultConfigFile()) {}

	/**
	 * Tolerant read: missing/empty/invalid file → `{}` with a one-line notice.
	 * Values that fail validation (unknown house system) are dropped
	 * individually so a single typo can't poison every chart.
	 */
	load(): ChartConfig {
		let raw: string;
		try {
			raw = readFileSync(this.file, "utf8");
		} catch {
			return {};
		}

		// Best-effort 0600 (same posture as the profile store): never breaks
		// startup when the permission cannot be tightened.
		try {
			chmodSync(this.file, 0o600);
		} catch {
			// ignore: read-only FS or other
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			console.warn(`lumen: ignoring invalid config file ${this.file}`);
			return {};
		}

		if (
			parsed === null ||
			typeof parsed !== "object" ||
			Array.isArray(parsed)
		) {
			console.warn(`lumen: ignoring invalid config file ${this.file}`);
			return {};
		}

		const record = parsed as Record<string, unknown>;
		const config: ChartConfig = {};

		const houseSystem = record.houseSystem;
		if (typeof houseSystem === "string") {
			try {
				config.houseSystem = normalizeHouseSystem(houseSystem);
			} catch {
				console.warn(
					`lumen: ignoring unknown house system "${houseSystem}" in ${this.file}`,
				);
			}
		}

		return config;
	}
}
