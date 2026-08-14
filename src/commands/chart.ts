import type { AxiCliCommand } from "axi-sdk-js";
import { NatalIntake } from "../cli/natal-intake";
import {
	AstrologicalEngine,
	type AstrologicalReading,
} from "../core/astrological-engine";

export const chartUsage = NatalIntake.usage;

export const chartCommand: AxiCliCommand<string | AstrologicalReading> = async (
	args,
) => {
	const result = await NatalIntake.process(args);

	if (result.kind === "help") {
		return NatalIntake.usage;
	}

	const engine = new AstrologicalEngine();
	return engine.compute(result.request);
};
