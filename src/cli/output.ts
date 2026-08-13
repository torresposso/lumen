import type {
	AstrologicalReading,
	BirthEcho,
	LonProjection,
	Projection,
} from "../core/chart-engine";

export type { AstrologicalReading, BirthEcho, LonProjection, Projection };
export type ChartOutput = AstrologicalReading;

/** Helper function re-exporting computation result as chart output. */
export function formatChart(reading: AstrologicalReading): AstrologicalReading {
	return reading;
}
