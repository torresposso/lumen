import type { ToonProfile } from "../../domain/toon";
import type { SolLunaPhaseOutput } from "../natal/phases";
import type { AspectStress } from "../shared/aspects";

export interface ProgressedTargetOutput {
	dateTime: string;
	jdUt: number;
	ageYears: number;
	progressedJdUt: number;
}

export interface ProgressedBody {
	sign: string;
	signDeg: number;
	natalHouse: number;
	retrograde: boolean;
	speed: number;
	dec: number;
	outOfBounds: boolean;
}

export interface ProgressedAspect {
	progressedBody: string;
	natalPoint: string;
	aspect: string;
	orb: number;
	isApplying: boolean;
	stress: AspectStress;
	progressedNatalHouse: number;
}

export interface ProgressedSkippedStepActivation {
	progressedBody: string;
	skippedStepBody: string;
	aspect: string;
	orb: number;
	isApplying: boolean;
	resolutionNode: "north" | "south";
	stress: AspectStress;
	progressedNatalHouse: number;
}

export interface ProgressedEvolutionaryTriggers {
	plutoContacts: ProgressedAspect[];
	pppContacts: ProgressedAspect[];
	nodalContacts: ProgressedAspect[];
	skippedStepActivations: ProgressedSkippedStepActivation[];
}

export interface ProgressedChartOutput {
	target: ProgressedTargetOutput;
	birth: ToonProfile;
	meta: {
		zodiac: "tropical";
		ephemeris: string;
		solLunaPhase: SolLunaPhaseOutput;
	};
	progressedBodies: Record<string, ProgressedBody>;
	aspectsToNatal: ProgressedAspect[];
	evolutionaryTriggers: ProgressedEvolutionaryTriggers;
}

export interface ProgressionsInterpretationOutput {
	progressionsInterpretation: {
		target: {
			dateTime: string;
			jdUt: number;
			ageYears: number;
			progressedJdUt: number;
		};
		natal: ToonProfile;
		solLunaPhase: {
			phaseNumber: number;
			phaseName: string;
			archetype: string;
			sunMoonAngle: number;
			isWaxing: boolean;
			description: string;
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
}
