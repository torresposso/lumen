import type { ToonProfile } from "../../domain/toon";
import type { AspectStress, StressedAspectDef } from "../shared/aspects";
import type { ProjectedEclipticPoint } from "../shared/geometry";
import type { DispositorStep } from "../shared/rulers";
import type { SolLunaPhaseOutput } from "./phases";

export type {
	AspectStress,
	DispositorStep,
	ProjectedEclipticPoint,
	StressedAspectDef,
};

export interface AspectProjection {
	a: string;
	b: string;
	aspect: string;
	orb: number;
	phase: "applying" | "separating" | "exact";
	strength: number;
	stress?: AspectStress;
}

export interface DeclinationAspectProjection {
	a: string;
	b: string;
	aspect: string;
	orb: number;
}

export interface ChartBodyProjection {
	sign: string;
	signDeg: number;
	house: number;
	retrograde: boolean;
	speed: number;
	dec: number;
	outOfBounds: boolean;
	dignities: string[];
}

export interface AngleProjection {
	sign: string;
	signDeg: number;
	lon?: number;
}

export interface CuspProjection {
	house: number;
	sign: string;
	signDeg: number;
	ruler: string;
	lon?: number;
}

export interface EclipticGeometryProjection {
	bodies: Record<string, ChartBodyProjection>;
	angles: {
		asc: AngleProjection;
		mc: AngleProjection;
		vertex: AngleProjection;
		eastPoint: AngleProjection;
	};
	cusps: CuspProjection[];
	aspects: AspectProjection[];
	declinationAspects: DeclinationAspectProjection[];
	phase?: SolLunaPhaseOutput;
}

export type DispositorTerminalType =
	| "final_dispositor"
	| "mutual_reception"
	| "loop";

export interface DispositorChainOutput {
	steps: DispositorStep[];
	terminalType: DispositorTerminalType;
	terminalBodies: string[];
}

export interface SkippedStepProjection {
	body: string;
	aspect: string;
	orb: number;
	resolutionNode: "north" | "south";
}

export interface AstrologicalSignature {
	hemispheres: {
		eastern: number;
		western: number;
		northern: number;
		southern: number;
	};
	quadrants: {
		q1: number;
		q2: number;
		q3: number;
		q4: number;
	};
	elements: {
		fire: number;
		earth: number;
		air: number;
		water: number;
	};
	modalities: {
		cardinal: number;
		fixed: number;
		mutable: number;
	};
}

export interface ShadowAntisciaProjection {
	antiscion: ProjectedEclipticPoint;
	contraAntiscion: ProjectedEclipticPoint;
}

export interface PPPFact {
	sign: string;
	signDeg: number;
	house: number;
	active: boolean;
	separationFromNorthNode?: number;
	aspects: Array<{ body: string; aspect: string; orb: number }>;
	antiscia?: ShadowAntisciaProjection;
}

export type NodeMotionStatus = "retrograde" | "direct" | "stationary";

export interface NodalRulerPlacement {
	body: string;
	sign: string;
	signDeg: number;
	house: number;
	motion: "direct" | "retrograde" | "stationary";
}

export interface NodalPointFact {
	sign: string;
	signDeg: number;
	house: number;
	speed: number;
	dec: number;
	outOfBounds: boolean;
	ruler?: string;
	rulerPlacement?: NodalRulerPlacement;
	antiscia?: ShadowAntisciaProjection;
}

export interface NodalAxisFact {
	north: NodalPointFact;
	south: NodalPointFact;
	motion: NodeMotionStatus;
}

export interface EclipseFact {
	type: string;
	sign: string;
	signDeg: number;
	house: number;
	tMax: number;
	daysBeforeBirth: number;
}

export interface PrenatalEclipsesFact {
	solar?: EclipseFact;
	lunar?: EclipseFact;
}

export interface AspectPattern {
	type: string;
	bodies: string[];
	orb?: number;
	element?: string;
	modality?: string;
	apex?: string;
	sign?: string;
	house?: number;
}

export interface SoulLotsProjection {
	fortune: ProjectedEclipticPoint;
	spirit: ProjectedEclipticPoint;
	eros: ProjectedEclipticPoint;
	necessity: ProjectedEclipticPoint;
	courage: ProjectedEclipticPoint;
	victory: ProjectedEclipticPoint;
	nemesis: ProjectedEclipticPoint;
	isDay: boolean;
}

export interface TrueLilithFact {
	sign: string;
	signDeg: number;
	house: number;
	speed: number;
	dec: number;
	outOfBounds: boolean;
}

export interface EvolutionaryCoreFact {
	ppp: PPPFact;
	plutoNorthNodeMidpoint: {
		near: ProjectedEclipticPoint;
		anti: ProjectedEclipticPoint;
	};
	nodalAxis: NodalAxisFact;
	skippedSteps: SkippedStepProjection[];
	dispositorChains: {
		pluto: DispositorChainOutput;
		southNodeRuler?: DispositorChainOutput;
		northNodeRuler?: DispositorChainOutput;
	};
	prenatalEclipses: PrenatalEclipsesFact;
	trueLilith: TrueLilithFact;
	soulLots: SoulLotsProjection;
}

export interface NatalChartOutput {
	birth: ToonProfile;
	meta: {
		houseSystem: "porphyry";
		zodiac: "tropical";
		ephemeris: string;
		solLunaPhase: SolLunaPhaseOutput;
	};
	bodies: Record<string, ChartBodyProjection>;
	angles: {
		asc: AngleProjection;
		mc: AngleProjection;
		vertex: AngleProjection;
		eastPoint: AngleProjection;
	};
	cusps: CuspProjection[];
	aspects: AspectProjection[];
	declinationAspects?: DeclinationAspectProjection[];
	patterns: AspectPattern[];
	signature: AstrologicalSignature;
	evolutionary: EvolutionaryCoreFact;
}

export interface NatalInterpretationOutput {
	natalInterpretation: {
		profile: ToonProfile;
		karmicRoot: {
			pluto: {
				sign: string;
				house: number;
				degree: number;
				isRetrograde: boolean;
				polarityPoint: { sign: string; house: number; degree: number };
			};
			nodalAxis: {
				northNode: {
					sign: string;
					house: number;
					ruler: string;
					rulerLocation: { sign: string; house: number };
				};
				southNode: {
					sign: string;
					house: number;
					ruler: string;
					rulerLocation: { sign: string; house: number };
				};
			};
			skippedSteps: Array<{
				planet: string;
				sign: string;
				house: number;
				squareToNode: "north" | "south" | "both";
				resolutionNode: "north" | "south";
			}>;
			dispositorDynamics: {
				dominantLoop: string[];
				finalDispositors: string[];
			};
			prenatalEclipses: {
				solar: { sign: string; house: number; formatted: string };
				lunar: { sign: string; house: number; formatted: string };
			};
			soulLots: {
				lotOfFortune: { sign: string; house: number; formatted: string };
				lotOfSpirit: { sign: string; house: number; formatted: string };
			};
		};
	};
}
