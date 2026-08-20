import {
	antiscion,
	contraAntiscion,
	fmtLon,
	houseOf,
	midpointLon,
	SIGNS,
} from "caelus";

export function formatEclipticDegree(lon: number): string {
	return fmtLon(lon).trim();
}

export interface ProjectedEclipticPoint {
	lon: number;
	sign: string;
	signDeg: number;
	house: number;
}

export function normalizeLongitude(lon: number): number {
	let val = lon % 360;
	if (val < 0) val += 360;
	if (Math.abs(val - 360) < 1e-9 || Math.abs(val) < 1e-9) val = 0;
	return val;
}

export function angularDistance(lonA: number, lonB: number): number {
	let diff = Math.abs(lonA - lonB);
	if (diff > 180) diff = 360 - diff;
	return diff;
}

export function angularDistanceDirect(lonFrom: number, lonTo: number): number {
	return normalizeLongitude(lonTo - lonFrom);
}

export function signOf(lon: number): string {
	const norm = normalizeLongitude(lon);
	const idx = Math.floor(norm / 30) % 12;
	const sign = SIGNS[idx];
	if (!sign) throw new Error(`unreachable: sign index ${idx} out of range`);
	return sign;
}

export function roundPrecision(val: number, digits = 4): number {
	return Number(val.toFixed(digits));
}

export function projectPoint(
	rawLon: number,
	cusps?: number[],
	digits = 4,
): ProjectedEclipticPoint {
	const norm = normalizeLongitude(rawLon);
	const lon = normalizeLongitude(roundPrecision(norm, digits));
	let signDeg = roundPrecision(norm % 30, digits);
	let sign = signOf(norm);
	if (signDeg >= 30) {
		signDeg = 0;
		sign = signOf((norm + 30) % 360);
	}
	const house = cusps && cusps.length >= 12 ? houseOf(norm, cusps) : 1;
	return { lon, sign, signDeg, house };
}

export function computeMidpoints(
	lonA: number,
	lonB: number,
	cusps?: number[],
): {
	near: ProjectedEclipticPoint;
	anti: ProjectedEclipticPoint;
} {
	const nearLon = midpointLon(lonA, lonB);
	const farLon = normalizeLongitude(nearLon + 180);

	return {
		near: projectPoint(nearLon, cusps),
		anti: projectPoint(farLon, cusps),
	};
}

export function computeShadowAntiscia(
	lon: number,
	cusps?: number[],
): {
	antiscion: ProjectedEclipticPoint;
	contraAntiscion: ProjectedEclipticPoint;
} {
	const ant = antiscion(lon);
	const contra = contraAntiscion(lon);

	return {
		antiscion: projectPoint(ant, cusps),
		contraAntiscion: projectPoint(contra, cusps),
	};
}
