import type { ToonProfile } from "../../domain/toon";
import type { AngleProjection, CuspProjection } from "../natal/types";
import type { AspectStress } from "../shared/aspects";

export interface TransitTargetOutput {
	dateTime: string;
	jdUt: number;
	place?: string;
	lat?: number;
	lon?: number;
}

export interface TransitNatalOutput {
	id: string;
	name: string;
	birthPlace: string;
	birthDateTime: string;
	birthLat: number;
	birthLon: number;
	birthJdUt: number;
}

export interface TransitBody {
	sign: string;
	signDeg: number;
	natalHouse: number;
	localHouse?: number;
	retrograde: boolean;
	speed: number;
	dec: number;
	outOfBounds: boolean;
}

export interface TransitAspect {
	transitBody: string;
	natalPoint: string;
	aspect: string;
	orb: number;
	isApplying: boolean;
	stress: AspectStress;
	transitingNatalHouse: number;
}

export interface SkippedStepTransitActivation {
	transitBody: string;
	skippedStepBody: string;
	aspect: string;
	orb: number;
	isApplying: boolean;
	resolutionNode: "north" | "south";
	transitingNatalHouse: number;
}

export interface TransitEvolutionaryTriggers {
	plutoContacts: TransitAspect[];
	pppContacts: TransitAspect[];
	nodalContacts: TransitAspect[];
	skippedStepActivations: SkippedStepTransitActivation[];
	dispositorActivations: TransitAspect[];
}

export interface TransitChartOutput {
	target: TransitTargetOutput;
	birth: ToonProfile;
	meta: {
		houseSystem?: "porphyry";
		zodiac: "tropical";
		ephemeris: string;
	};
	transitingBodies: Record<string, TransitBody>;
	transitAngles?: {
		asc: AngleProjection;
		mc: AngleProjection;
		vertex: AngleProjection;
		eastPoint: AngleProjection;
	};
	transitCusps?: CuspProjection[];
	aspectsToNatal: TransitAspect[];
	evolutionaryTriggers: TransitEvolutionaryTriggers;
	outOfBounds: string[];
}

export interface TransitsInterpretationOutput {
	transitsInterpretation: {
		target: {
			dateTime: string;
			jdUt: number;
			coordinates?: { lat: number; lon: number; place?: string };
		};
		natal: ToonProfile;
		activeTriggers: Array<{
			transitingBody: string;
			natalPoint: string;
			aspect: string;
			orb: number;
			isApplying: boolean;
			transitingHouse: number;
			natalHouseRuled?: number;
		}>;
		outOfBoundsTransits: Array<{
			planet: string;
			declination: number;
			status: "out_of_bounds_north" | "out_of_bounds_south";
		}>;
	};
}
