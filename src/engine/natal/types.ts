import type { ToonProfile } from "../../domain/toon";
import type { AspectStress, StressedAspectDef } from "../shared/aspects";
import type { ProjectedEclipticPoint } from "../shared/geometry";
import type { DispositorStep } from "../shared/rulers";

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
}

export interface DeclinationAspectProjection {
	a: string;
	b: string;
	aspect: string;
	orb: number;
}

export interface ChartBodyProjection {
	lon: number;
	sign: string;
	signDeg: number;
	house: number;
	retrograde: boolean;
	speed: number;
	lat: number;
	dist: number | null;
	ra: number;
	dec: number;
	outOfBounds: boolean;
	dignities: string[];
}

export interface AngleProjection {
	lon: number;
	sign: string;
	signDeg: number;
}

export interface CuspProjection {
	lon: number;
	sign: string;
	signDeg: number;
}

export interface HouseRulerRow {
	house: number;
	sign: string;
	ruler: string;
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
	houseRulers: HouseRulerRow[];
	phase?: string;
}

export interface PlutoAspectProjection {
	body: string;
	aspect: string;
	orb: number;
	stress: AspectStress;
	phase?: "applying" | "separating" | "exact";
}

export interface PPPAspectProjection {
	body: string;
	aspect: string;
	orb: number;
}

export interface NodeAspectProjection {
	body: string;
	aspect: string;
	orb: number;
	stress: "stressful" | "nonstressful";
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

export interface SoulPlutoFact {
	sign: string;
	lon: number;
	house: number;
	signDeg: number;
	retrograde: boolean;
	stressfulCount: number;
	nonstressfulCount: number;
	aspects: PlutoAspectProjection[];
	antiscia?: ShadowAntisciaProjection;
}

export interface PPPFact {
	sign: string;
	lon: number;
	house: number;
	signDeg: number;
	active: boolean;
	separation?: number;
	reason?: string;
	aspects: PPPAspectProjection[];
	antiscia?: ShadowAntisciaProjection;
}

export interface PlutoPolarityOutput {
	pluto: SoulPlutoFact;
	ppp: PPPFact;
	midpoint?: ProjectedEclipticPoint;
	antiMidpoint?: ProjectedEclipticPoint;
	dispositorChain: DispositorChainOutput;
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
	lon: number;
	signDeg: number;
	house: number;
	ruler?: string;
	rulerPlacement?: NodalRulerPlacement;
	aspects: NodeAspectProjection[];
	antiscia?: ShadowAntisciaProjection;
}

export interface NodalAxisFact {
	north: NodalPointFact;
	south: NodalPointFact;
	motion: NodeMotionStatus;
	skippedSteps: SkippedStepProjection[];
}

export interface EclipseFact {
	tMax: number;
	type: string;
	lon: number;
	sign: string;
	signDeg: number;
	house: number;
}

export interface PrenatalEclipsesFact {
	solar?: EclipseFact;
	lunar?: EclipseFact;
}

export interface AspectPattern {
	type: string;
	bodies: string[];
	apex?: string | null;
	sign?: string | null;
	house?: number | null;
	element?: string;
	modality?: string;
	orb?: number;
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

export interface NatalChartOutput {
	birth: ToonProfile;
	houseSystem: "porphyry";
	zodiac: "tropical";
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
	pluto: SoulPlutoFact;
	ppp: PPPFact;
	midpoint?: ProjectedEclipticPoint;
	antiMidpoint?: ProjectedEclipticPoint;
	nodalAxis: NodalAxisFact;
	phase?: string;
	dispositorChains: {
		pluto: DispositorChainOutput;
		southNodeRuler?: DispositorChainOutput;
		northNodeRuler?: DispositorChainOutput;
	};
	prenatalEclipses: PrenatalEclipsesFact;
	lots: SoulLotsProjection;
	patterns: AspectPattern[];
	signature: AstrologicalSignature;
	houseRulers: HouseRulerRow[];
	counts: {
		plutoAspects: number;
		nodeAspects: number;
		skippedSteps: number;
		eclipses: number;
	};
	method: string;
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
