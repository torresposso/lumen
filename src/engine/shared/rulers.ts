export interface DispositorStep {
	body: string;
	sign: string;
	ruler: string;
}

export const SIGN_RULERS: Record<string, string> = {
	Aries: "mars",
	Taurus: "venus",
	Gemini: "mercury",
	Cancer: "moon",
	Leo: "sun",
	Virgo: "mercury",
	Libra: "venus",
	Scorpio: "pluto",
	Sagittarius: "jupiter",
	Capricorn: "saturn",
	Aquarius: "uranus",
	Pisces: "neptune",
};

export type DispositorTerminalType =
	| "final_dispositor"
	| "mutual_reception"
	| "loop";

export interface DispositorChainOutput {
	steps: DispositorStep[];
	terminalType: DispositorTerminalType;
	terminalBodies: string[];
}

export function buildDispositorChain(
	bodies: Record<string, { sign: string }>,
	startBodyId: string,
	maxDepth = 12,
): DispositorChainOutput {
	const steps: DispositorStep[] = [];
	let currentId = startBodyId;
	const visitedOrder: string[] = [];
	const visitedSet = new Set<string>();

	for (let i = 0; i < maxDepth; i++) {
		const body = bodies[currentId];
		if (!body) break;

		const ruler = SIGN_RULERS[body.sign];
		if (!ruler) break;

		if (visitedSet.has(currentId)) {
			// Loop detected. Find the cycle starting from currentId.
			const loopStartIndex = visitedOrder.indexOf(currentId);
			const loopBodies = visitedOrder.slice(loopStartIndex);
			const terminalType: DispositorTerminalType =
				loopBodies.length === 2 ? "mutual_reception" : "loop";
			return {
				steps,
				terminalType,
				terminalBodies: loopBodies,
			};
		}

		visitedSet.add(currentId);
		visitedOrder.push(currentId);
		steps.push({ body: currentId, sign: body.sign, ruler });

		if (ruler === currentId) {
			// Final dispositor (planet in its own domicile)
			return {
				steps,
				terminalType: "final_dispositor",
				terminalBodies: [currentId],
			};
		}

		currentId = ruler;
	}

	// Fallback if maxDepth reached without clean termination
	return {
		steps,
		terminalType: "loop",
		terminalBodies: visitedOrder.slice(-2),
	};
}
