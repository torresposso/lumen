import {
	installSessionStartHooks,
	shouldInstallHooksForNodeAxiExecPath,
} from "axi-sdk-js";

const HOOK_POLICY = { marker: "lumen", binaryNames: ["lumen"] };

export const setupUsage = [
	"lumen setup hooks",
	"",
	"Instala o actualiza la integración de sesión (hooks + plugin OpenCode).",
].join("\n");

export function resolveExecPath(): string {
	const argv1 = process.argv[1] ?? "";
	return argv1.startsWith("/$bunfs/") ? process.execPath : argv1;
}

export async function setupCommand(
	args: string[],
): Promise<Record<string, unknown>> {
	if (args[0] !== "hooks") {
		return {
			error: "Unknown setup command",
			help: ["Run `lumen setup hooks`"],
		};
	}

	const execPath = resolveExecPath();
	if (!shouldInstallHooksForNodeAxiExecPath(execPath, HOOK_POLICY)) {
		return {
			error: "Cannot install session hooks from this executable",
			help: ["Run `bun run build`, then `./dist/lumen setup hooks`"],
		};
	}

	installSessionStartHooks({ ...HOOK_POLICY, execPath });
	return { setup: "hooks installed or already up to date" };
}
