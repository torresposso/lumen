import type { AspectStress } from "../shared/aspects";

export interface ProgressedTargetOutput {
	dateTime: string;
	jdUt: number;
	ageYears: number;
	progressedJdUt: number;
}

export interface ProgressedNatalOutput {
	id: string;
	name?: string | null;
	birthPlace: string;
	birthDateTime: string;
	birthLat: number;
	birthLon: number;
	birthJdUt: number;
}

export interface ProgressedSolLunaPhase {
	phase: string;
	angle: number;
	description: string;
}

export interface ProgressedBody {
	name: string;
	lon: number;
	sign: string;
	signDeg: number;
	lat: number;
	dec: number;
	speed: number;
	retrograde: boolean;
	natalHouse: number;
	outOfBounds: boolean;
}

export interface ProgressedAspect {
	progressedBody: string;
	natalPoint: string;
	aspect: string;
	orb: number;
	maxOrb: number;
	isApplying: boolean;
	stress: AspectStress;
}

export interface ProgressedSkippedStepActivation extends ProgressedAspect {
	skippedStepBody: string;
	resolutionNode: "north" | "south";
}

export interface ProgressedEvolutionaryTriggers {
	plutoContacts: ProgressedAspect[];
	pppContacts: ProgressedAspect[];
	nodalContacts: ProgressedAspect[];
	skippedStepActivations: ProgressedSkippedStepActivation[];
}

export interface ProgressedChartOutput {
	target: ProgressedTargetOutput;
	natal: ProgressedNatalOutput;
	zodiac: "tropical";
	solLunaPhase: ProgressedSolLunaPhase;
	progressedBodies: Record<string, ProgressedBody>;
	aspectsToNatal: ProgressedAspect[];
	evolutionaryTriggers: ProgressedEvolutionaryTriggers;
	method: string;
}
