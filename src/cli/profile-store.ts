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
import { z } from "zod";
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

const profileFileSchema = z.object({
	version: z.literal(1),
	profiles: z.record(
		z.string(),
		z.object({
			id: z.string(),
			birth: z.object({
				jdUt: z.number(),
				lat: z.number(),
				lon: z.number(),
				local: z.object({
					year: z.number(),
					month: z.number(),
					day: z.number(),
					hour: z.number(),
					minute: z.number(),
				}),
				zone: z.string(),
				offsetMinutes: z.number(),
				dst: z.boolean(),
				status: z.string(),
			}),
			options: z.object({
				houseSystem: z.string(),
				zodiac: z.literal("tropical"),
				node: z.enum(["both", "mean", "true"]),
				bodies: z.array(z.string()),
				topocentric: z.boolean(),
				draconic: z.boolean(),
				eclipses: z.boolean(),
				lots: z.boolean(),
				stars: z.boolean(),
				evolutionary: z.boolean(),
			}),
			createdAt: z.string(),
			updatedAt: z.string(),
		}),
	),
});

function parseFile(contents: string): ProfileFile {
	const parsed: unknown = JSON.parse(contents);
	const result = profileFileSchema.safeParse(parsed);
	if (!result.success) {
		throw new Error("unsupported profile file");
	}
	return result.data as ProfileFile;
}

function readFile(filePath: string): ProfileFile {
	if (!existsSync(filePath)) return emptyFile();
	try {
		const file = parseFile(readFileSync(filePath, "utf8"));
		try {
			chmodSync(filePath, 0o600);
		} catch {
			// Reading still succeeded; keep the store usable on read-only filesystems.
		}
		return file;
	} catch (err) {
		throw new AxiError(
			`Could not read profile store: ${err instanceof Error ? err.message : String(err)}`,
			"PROFILE_ERROR",
			[`Move or remove ${filePath} and run \`lumen profile list\` again`],
		);
	}
}

function writeFile(filePath: string, data: ProfileFile): void {
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
