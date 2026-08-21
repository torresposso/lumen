import type { ToonProfile } from "../../domain/toon";
import type { NatalInterpretationOutput } from "../natal/types";
import type { TransitsInterpretationOutput } from "../transits/types";

export interface SkippedStepActivation {
	transitingBody: string;
	transitingHouse: number;
	skippedPlanet: string;
	aspect: string;
	orb: number;
	resolutionNode: "north" | "south";
	targetNode: { sign: string; house: number };
}

export interface PlutoNodePressure {
	transitingBody: string;
	transitingHouse: number;
	targetPoint: "pluto" | "ppp" | "north_node" | "south_node";
	aspect: string;
	orb: number;
}

export interface EvolutionaryDynamics {
	skippedStepActivations: SkippedStepActivation[];
	plutoNodePressure: PlutoNodePressure[];
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
		soulClock: {
			phase: {
				name: string;
				number: number;
				angle: number;
				isWaxing: boolean;
			};
			progressedSun: { sign: string; house: number; degree: number };
			progressedMoon: { sign: string; house: number; degree: number };
			progressedTriggers: Array<{
				progressedBody: string;
				natalPoint: string;
				aspect: string;
				orb: number;
			}>;
		};
		cosmicTriggers: {
			activeTransits: TransitsInterpretationOutput["transitsInterpretation"]["activeTriggers"];
			outOfBoundsTransits: TransitsInterpretationOutput["transitsInterpretation"]["outOfBoundsTransits"];
		};
		evolutionaryDynamics: EvolutionaryDynamics;
	};
}
