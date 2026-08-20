export const MIN_YEAR = 1800;
export const MAX_YEAR = 2100;
export const MIN_OFFSET_MINUTES = -840;
export const MAX_OFFSET_MINUTES = 840;

export interface LocalTime {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
}

export const DATETIME_RE =
	/^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{1,2}):(\d{1,2})(Z|[+-]\d{2}:\d{2})$/;

export const NUMBER_RE = /^[+-]?\d+(?:\.\d+)?$/;

export function pad2(value: number): string {
	return String(value).padStart(2, "0");
}

export function isLeapYear(year: number): boolean {
	return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function daysInMonth(year: number, month: number): number {
	switch (month) {
		case 2:
			return isLeapYear(year) ? 29 : 28;
		case 4:
		case 6:
		case 9:
		case 11:
			return 30;
		default:
			return 31;
	}
}

export function checkIntRange(
	issues: string[],
	value: number,
	min: number,
	max: number,
	label: string,
): void {
	if (!Number.isInteger(value) || value < min || value > max) {
		issues.push(`${label} must be an integer ${min}..${max}`);
	}
}

export function offsetToMinutes(
	suffix: string,
	issues: string[],
	labels: { when: string },
): number {
	const sign = suffix.startsWith("-") ? -1 : 1;
	const [hh, mm] = suffix
		.slice(1)
		.split(":")
		.map((p) => Number(p));
	if (
		hh === undefined ||
		mm === undefined ||
		!Number.isInteger(hh) ||
		!Number.isInteger(mm) ||
		mm < 0 ||
		mm > 59
	) {
		issues.push(`${labels.when} offset must be ±HH:MM, e.g. "-05:00" or "Z"`);
		return NaN;
	}
	return sign * (hh * 60 + mm);
}

export function julianDayUt(local: LocalTime, offsetMinutes: number): number {
	const utDay =
		local.day + (local.hour + local.minute / 60 - offsetMinutes / 60) / 24;
	const y = local.month <= 2 ? local.year - 1 : local.year;
	const m = local.month <= 2 ? local.month + 12 : local.month;
	const a = Math.floor(y / 100);
	const b = 2 - a + Math.floor(a / 4);
	return (
		Math.floor(365.25 * (y + 4716)) +
		Math.floor(30.6001 * (m + 1)) +
		utDay +
		b -
		1524.5
	);
}
