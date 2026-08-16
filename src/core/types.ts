import type { BodyId, HouseSystem, Zodiac } from "caelus";

// ============================================================================
// Birth & Intake Types
// ============================================================================

export type BirthStatus =
	| "ok"
	| "ambiguous"
	| "nonexistent"
	| "historical_estimate";

export interface BirthClockFields {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
}

export interface BirthProvenance {
	zone: string;
	offsetMinutes: number;
	dst: boolean;
	status: BirthStatus;
}

export interface ResolvedBirth {
	jdUt: number;
	lat: number;
	lon: number;
	local: BirthClockFields;
	zone: string;
	offsetMinutes: number;
	dst: boolean;
	status: BirthStatus;
}

export interface GeocodeResult {
	name: string;
	lat: number;
	lon: number;
	country?: string;
	admin1?: string;
	timezone?: string;
}

export interface Geocoder {
	search(query: string, limit?: number): Promise<GeocodeResult[]>;
}

export interface ChartRequestOptions {
	houseSystem: HouseSystem;
	zodiac: Zodiac;
	node: "both" | "mean" | "true";
	bodies: BodyId[];
	topocentric: boolean;
	draconic: boolean;
	eclipses: boolean;
	lots: boolean;
	stars: boolean;
	evolutionary: boolean;
}

export interface NatalRequest {
	birth: ResolvedBirth;
	options: ChartRequestOptions;
}

// ============================================================================
// Evolutionary Astrology & Chart Types (JWG)
// ============================================================================

export type SolLunaPhaseName =
	| "New"
	| "Crescent"
	| "First Quarter"
	| "Gibbous"
	| "Full"
	| "Disseminating"
	| "Last Quarter"
	| "Balsamic";

export type NodeMotionStatus = "retrograde" | "direct" | "stationary";

export interface SkippedStep {
	body: string;
	aspect: string;
	orb: number;
}

export interface NodalRulerPlacement {
	body: string;
	sign: string;
	signDeg: number;
	house: number;
	motion: "direct" | "retrograde" | "stationary";
	description: string;
}

export interface DispositorChainNode {
	body: string;
	rules: string;
	sign: string;
	next?: string;
}

export interface PlutoPolarityPoint {
	lon: number;
	sign: string;
	signDeg: number;
	house: number;
	active: boolean;
	description: string;
}

export interface EAEvolutionaryMechanics {
	pppActive: boolean;
	pppDescription?: string;
	plutoNodeMidpoint: {
		lon: number;
		sign: string;
		signDeg: number;
		house: number;
		formatted: string;
	};
	nodeMotion: NodeMotionStatus;
	plutoStressful: number;
	plutoNonstressful: number;
	skippedSteps: SkippedStep[];
	nodalRulers: {
		southNodeRuler: NodalRulerPlacement;
		northNodeRuler: NodalRulerPlacement;
	};
}

export interface EAChart {
	client?: string;
	pluto: {
		sign: string;
		house: number;
		lon: number;
	};
	ppp: {
		sign: string;
		house: number;
		lon: number;
		active: boolean;
	};
	southNode: {
		sign: string;
		house: number;
		lon: number;
	};
	northNode: {
		sign: string;
		house: number;
		lon: number;
	};
	phase: SolLunaPhaseName;
	evolutionaryMechanics: EAEvolutionaryMechanics;
}

// ============================================================================
// Consultation & Clinical Tracking Types
// ============================================================================

export type ConsultationStatus = "open" | "closed";

export type HypothesisResponseEnum =
	| "reliving"
	| "fruition"
	| "dual"
	| "activo"
	| "en_proceso"
	| "integrado"
	| string;

export interface Hypothesis {
	id: string;
	campo: string;
	pregunta: string;
	respuestasValidas: readonly string[];
	respuestaRegistrada?: HypothesisResponseEnum;
	nota?: string;
	confirmedAt?: string;
}

export interface ConsultationSession {
	id: string;
	clientId: string;
	status: ConsultationStatus;
	openedAt: string;
	closedAt?: string;
	motivo?: string;
	hipotesis: Hypothesis[];
	notas: string[];
	sintesis?: string;
	tarea?: string;
}

// ============================================================================
// Client Profile Types
// ============================================================================

export interface ClientProfile {
	id: string;
	birth: ResolvedBirth;
	createdAt: string;
	updatedAt: string;
	notes?: string;
}
