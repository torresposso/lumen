import {
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { AxiError } from "axi-sdk-js";
import type { ChartRequestOptions, NatalRequest } from "./natal-intake";

export interface StoredProfile {
	id: string;
	birth: NatalRequest["birth"];
	options: ChartRequestOptions;
	createdAt: string;
	updatedAt: string;
}

export interface ProfileSummary {
	id: string;
	born: string;
}

interface ProfileFile {
	version: 1;
	profiles: Record<string, StoredProfile>;
}

function pad(value: number): string {
	return value.toString().padStart(2, "0");
}

export function birthDateLabel(birth: StoredProfile["birth"]): string {
	return `${birth.local.year}-${pad(birth.local.month)}-${pad(birth.local.day)}`;
}

export function defaultProfilesDir(): string {
	return process.env.LUMEN_PROFILES_DIR ?? join(homedir(), ".config", "lumen");
}

export function defaultProfilesFile(): string {
	return join(defaultProfilesDir(), "profiles.json");
}

function emptyFile(): ProfileFile {
	return { version: 1, profiles: {} };
}

function readFile(filePath: string): ProfileFile {
	if (!existsSync(filePath)) return emptyFile();
	try {
		const parsed = JSON.parse(readFileSync(filePath, "utf8")) as ProfileFile;
		if (parsed?.version !== 1 || typeof parsed.profiles !== "object") {
			throw new Error("unsupported profile file");
		}
		return parsed;
	} catch (err) {
		throw new AxiError(
			`Could not read profile store: ${err instanceof Error ? err.message : String(err)}`,
			"PROFILE_ERROR",
			[`Move or remove ${filePath} and run \`lumen profile list\` again`],
		);
	}
}

function writeFile(filePath: string, data: ProfileFile): void {
	mkdirSync(dirname(filePath), { recursive: true });
	const tmp = `${filePath}.tmp`;
	writeFileSync(tmp, `${JSON.stringify(data, null, "\t")}\n`);
	renameSync(tmp, filePath);
}

/** Local JSON store for saved birth profiles. Kept deliberately small so the
 *  session hook and home view never leak full birth data. */
export class ProfileStore {
	constructor(
		private readonly filePath: string = defaultProfilesFile(),
		private readonly now: () => Date = () => new Date(),
	) {}

	list(): ProfileSummary[] {
		const file = readFile(this.filePath);
		return Object.values(file.profiles)
			.map((profile) => ({
				id: profile.id,
				born: birthDateLabel(profile.birth),
			}))
			.sort((a, b) => a.id.localeCompare(b.id));
	}

	get(id: string): StoredProfile | undefined {
		return readFile(this.filePath).profiles[id];
	}

	add(id: string, request: NatalRequest): StoredProfile {
		const file = readFile(this.filePath);
		const now = this.now().toISOString();
		const previous = file.profiles[id];
		const profile: StoredProfile = {
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
