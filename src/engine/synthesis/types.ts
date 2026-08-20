import type { ToonProfile } from "../../domain/toon";
import type { NatalInterpretationOutput } from "../natal/types";
import type { ProgressionsInterpretationOutput } from "../progressions/types";
import type { TransitsInterpretationOutput } from "../transits/types";

export interface SkippedStepActivation {
	transitingBody: string;
	skippedPlanet: string;
	aspect: string;
	orb: number;
	resolutionNode: "north" | "south";
	evolutionaryMandate: string;
}

export interface PlutoNodePressure {
	transitingBody: string;
	targetPoint: "pluto" | "ppp" | "north_node" | "south_node";
	aspect: string;
	orb: number;
}

export interface EvolutionaryDynamics {
	skippedStepActivations: SkippedStepActivation[];
	plutoNodePressure: PlutoNodePressure[];
	phaseContextGuidance: string;
}

export interface EvolutionarySynthesisOutput {
	synthesis: {
		profile: ToonProfile;
		targetMoment: {
			when: string;
			where?: string;
			jdUt: number;
		};
		karmicRoot: NatalInterpretationOutput["natalInterpretation"]["karmicRoot"];
		soulClock: ProgressionsInterpretationOutput["progressionsInterpretation"]["solLunaPhase"] & {
			progressedSun: { sign: string; house: number; degree: number };
			progressedMoon: { sign: string; house: number; degree: number };
			progressedTriggers: ProgressionsInterpretationOutput["progressionsInterpretation"]["progressedTriggers"];
		};
		cosmicTriggers: {
			activeTransits: TransitsInterpretationOutput["transitsInterpretation"]["activeTriggers"];
			outOfBoundsTransits: TransitsInterpretationOutput["transitsInterpretation"]["outOfBoundsTransits"];
		};
		evolutionaryDynamics: EvolutionaryDynamics;
		method: string;
	};
}
