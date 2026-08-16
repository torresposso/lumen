import {
	chmodSync,
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { AxiError } from "axi-sdk-js";
import type {
	BirthStatus,
	ChartRequestOptions,
	NatalRequest,
} from "../core/types";

export interface StoredClient {
	id: string;
	birth: NatalRequest["birth"];
	options: ChartRequestOptions;
	createdAt: string;
	updatedAt: string;
}

/** Privacy-safe summary: id, provenance status and last update. Never a birth date. */
export interface ClientSummary {
	id: string;
	birthStatus: BirthStatus;
	updatedAt: string;
}

export type StoredProfile = StoredClient;
export type ProfileSummary = ClientSummary;

interface ClientFile {
	version: 1;
	profiles: Record<string, StoredClient>;
}

export function defaultClientsDir(): string {
	return process.env.LUMEN_PROFILES_DIR ?? join(homedir(), ".config", "lumen");
}

export function defaultClientsFile(): string {
	return join(defaultClientsDir(), "clients.json");
}

/** Legacy profile file path kept for retrocompatibility with existing stores. */
export function defaultProfilesFile(): string {
	return join(defaultClientsDir(), "profiles.json");
}

export function defaultProfilesDir(): string {
	return defaultClientsDir();
}

function emptyFile(): ClientFile {
	return { version: 1, profiles: {} };
}

const BIRTH_STATUSES = new Set<string>(["ok", "ambiguous", "nonexistent"]);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isBirth(value: unknown): value is NatalRequest["birth"] {
	if (!isRecord(value)) return false;
	const local = value.local;
	return (
		typeof value.jdUt === "number" &&
		typeof value.lat === "number" &&
		typeof value.lon === "number" &&
		isRecord(local) &&
		typeof local.year === "number" &&
		typeof local.month === "number" &&
		typeof local.day === "number" &&
		typeof local.hour === "number" &&
		typeof local.minute === "number" &&
		typeof value.zone === "string" &&
		typeof value.offsetMinutes === "number" &&
		typeof value.dst === "boolean" &&
		typeof value.status === "string" &&
		BIRTH_STATUSES.has(value.status)
	);
}

function isOptions(value: unknown): value is ChartRequestOptions {
	if (!isRecord(value)) return false;
	return (
		typeof value.houseSystem === "string" &&
		value.zodiac === "tropical" &&
		(value.node === "both" || value.node === "mean" || value.node === "true") &&
		Array.isArray(value.bodies) &&
		value.bodies.every((body) => typeof body === "string") &&
		typeof value.topocentric === "boolean" &&
		typeof value.draconic === "boolean" &&
		typeof value.eclipses === "boolean" &&
		typeof value.lots === "boolean" &&
		typeof value.stars === "boolean" &&
		typeof value.evolutionary === "boolean"
	);
}

function isStoredClient(value: unknown): value is StoredClient {
	if (!isRecord(value)) return false;
	return (
		typeof value.id === "string" &&
		isBirth(value.birth) &&
		isOptions(value.options) &&
		typeof value.createdAt === "string" &&
		typeof value.updatedAt === "string"
	);
}

function isClientFile(value: unknown): value is ClientFile {
	if (!isRecord(value)) return false;
	return (
		value.version === 1 &&
		isRecord(value.profiles) &&
		Object.values(value.profiles).every(isStoredClient)
	);
}

function parseFile(contents: string): ClientFile {
	const parsed: unknown = JSON.parse(contents);
	if (!isClientFile(parsed)) {
		throw new Error("unsupported profile file");
	}
	return parsed;
}

function readFile(filePath: string): ClientFile {
	if (!existsSync(filePath)) return emptyFile();
	try {
		const file = parseFile(readFileSync(filePath, "utf8"));
		try {
			chmodSync(filePath, 0o600);
		} catch {
			// Keep the store usable on read-only filesystems.
		}
		return file;
	} catch (err) {
		throw new AxiError(
			`Could not read profile store: ${err instanceof Error ? err.message : String(err)}`,
			"PROFILE_ERROR",
			[`Move or remove ${filePath} and run \`lumen client list\` again`],
		);
	}
}

function writeFile(filePath: string, data: ClientFile): void {
	const dir = dirname(filePath);
	const tmp = `${filePath}.tmp`;
	try {
		mkdirSync(dir, { recursive: true, mode: 0o700 });
		writeFileSync(tmp, `${JSON.stringify(data, null, "\t")}\n`, {
			mode: 0o600,
		});
		renameSync(tmp, filePath);
	} catch (err) {
		throw new AxiError(
			`Could not write profile store: ${err instanceof Error ? err.message : String(err)}`,
			"PROFILE_ERROR",
			["Check that the profile directory is writable"],
		);
	}
}

/**
 * Local JSON store for saved birth profiles / clients.
 * XDG base, 0600 permissions and atomic tmp+rename writes.
 */
export class ClientStore {
	constructor(
		private readonly filePath: string = defaultProfilesFile(),
		private readonly now: () => Date = () => new Date(),
	) {}

	list(): ClientSummary[] {
		const file = readFile(this.filePath);
		return Object.values(file.profiles)
			.map((profile) => ({
				id: profile.id,
				birthStatus: profile.birth.status,
				updatedAt: profile.updatedAt,
			}))
			.sort((a, b) => a.id.localeCompare(b.id));
	}

	get(id: string): StoredClient | undefined {
		return readFile(this.filePath).profiles[id];
	}

	add(id: string, request: NatalRequest): StoredClient {
		const file = readFile(this.filePath);
		const now = this.now().toISOString();
		const previous = file.profiles[id];
		const profile: StoredClient = {
			id,
			birth: request.birth,
			options: request.options,
			createdAt: previous?.createdAt ?? now,
			updatedAt: now,
		};
		file.profiles[id] = profile;
		writeFile(this.filePath, file);
		return profile;
	}

	remove(id: string): boolean {
		const file = readFile(this.filePath);
		if (file.profiles[id] === undefined) return false;
		delete file.profiles[id];
		writeFile(this.filePath, file);
		return true;
	}
}

/** Retrocompatible class name for callers that still say "profile". */
export { ClientStore as ProfileStore };
