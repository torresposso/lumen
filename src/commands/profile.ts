import type { AxiCliCommand } from "axi-sdk-js";
import { AxiError } from "axi-sdk-js";
import type { CliContext } from "../cli/context";
import {
	clientAddUsage,
	clientCommand,
	clientListUsage,
	clientRemoveUsage,
	clientShowUsage,
	clientUsage,
} from "./client";

export const profileUsage = clientUsage.replace(/client/g, "profile");
export const profileAddUsage = clientAddUsage.replace(/client/g, "profile");
export const profileListUsage = clientListUsage.replace(/client/g, "profile");
export const profileShowUsage = clientShowUsage.replace(/client/g, "profile");
export const profileRemoveUsage = clientRemoveUsage.replace(
	/client/g,
	"profile",
);

export const profileCommand: AxiCliCommand<CliContext> = async (
	args,
	context,
) => {
	try {
		const res = await clientCommand(args, context);
		if (typeof res === "string") {
			return res.replace(/client/g, "profile");
		}
		if (typeof res === "object" && res !== null) {
			const obj = res as Record<string, unknown>;
			if ("clients" in obj) {
				return { ...obj, profiles: obj.clients };
			}
			if ("client" in obj) {
				return { ...obj, profile: obj.client };
			}
		}
		return res;
	} catch (err) {
		if (err instanceof AxiError) {
			const rewrittenMessage = err.message.replace(/client/g, "profile");
			const rewrittenHelp = (err.help ?? []).map((h) =>
				h.replace(/client/g, "profile"),
			);
			throw new AxiError(rewrittenMessage, err.code, rewrittenHelp);
		}
		throw err;
	}
};
