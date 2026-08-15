import {
	AxiError,
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
): Promise<string | Record<string, unknown>> {
	if (args[0] === undefined || args[0] === "--help") {
		return setupUsage;
	}
	if (args[0] !== "hooks" || args.length > 1) {
		throw new AxiError(
			`Unknown setup command: ${args.join(" ")}`,
			"VALIDATION_ERROR",
			["Run `lumen setup hooks`"],
		);
	}

	const execPath = resolveExecPath();
	if (!shouldInstallHooksForNodeAxiExecPath(execPath, HOOK_POLICY)) {
		throw new AxiError(
			"Cannot install session hooks from this executable",
			"HOOK_INSTALL_ERROR",
			["Run `bun run build`, then `./dist/lumen setup hooks`"],
		);
	}

	installSessionStartHooks({ ...HOOK_POLICY, execPath });
	return { setup: "hooks installed or already up to date" };
}
