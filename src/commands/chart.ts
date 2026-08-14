import type { AxiCliCommand } from "axi-sdk-js";
import { chartUsage, resolveNatalRequestFromArgs } from "../cli/intake";
import {
	AstrologicalEngine,
	type AstrologicalReading,
} from "../core/chart-engine";

export { chartUsage };

export const chartCommand: AxiCliCommand<string | AstrologicalReading> = async (
	args,
) => {
	const result = await resolveNatalRequestFromArgs(args);

	if (result.kind === "help") {
		return chartUsage;
	}

	const engine = new AstrologicalEngine();
	return engine.compute(result.request);
};
