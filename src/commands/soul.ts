import type { AxiCliCommand } from "axi-sdk-js";
import { AxiError } from "axi-sdk-js";
import { CaelusEphemeris } from "../adapters/ephemeris-gateway";
import { computeNodalReading, computePrenatalEclipses } from "../core/nodes";
import { computeSolLunaPhase } from "../core/phases";
import { computeSoulReading } from "../core/soul";
import type { CliContext } from "./client";
import {
	NatalIntake,
	type NatalRequest,
	requestFromProfile,
	takeProfileArg,
} from "./client";

export const soulUsage = [
	"lumen soul <client> [--full]",
	'lumen soul --when 1981-01-26T00:50 --place "Magangué, Colombia" [--full]',
	"",
	"Radiografía del estado basal del Alma y la intención evolutiva (JWG).",
	"Calcula el paradigma de Plutón, Punto de Polaridad, Eje Nodal, Pasos Omitidos y Regentes.",
	"Con --full: cadenas de dispositores, aspectos finos y eclipses prenatales (solar y lunar).",
].join("\n");

export const soulCommand: AxiCliCommand<CliContext> = async (args, context) => {
	if (args.length === 0 || args.includes("--help")) {
		return soulUsage;
	}

	const isFull = args.includes("--full");
	const filteredArgs = args.filter((a) => a !== "--full");

	let clientId: string | undefined;
	let request: NatalRequest;

	const first = filteredArgs[0];
	if (first !== undefined && !first.startsWith("-")) {
		// Positional client ID
		clientId = first;
		const rest = filteredArgs.slice(1);
		if (rest.length > 0) {
			throw new AxiError(
				"Cannot combine positional client id with extra flags",
				"VALIDATION_ERROR",
				[`Use \`lumen soul ${clientId}\` or inline birth flags`],
			);
		}
		request = requestFromProfile(context, clientId);
	} else {
		const { name, rest } = takeProfileArg(filteredArgs);
		if (name !== undefined) {
			if (rest.length > 0) {
				throw new AxiError(
					"Cannot combine --profile with inline birth flags",
					"VALIDATION_ERROR",
					[`Use \`lumen soul ${name}\` or inline birth flags`],
				);
			}
			clientId = name;
			request = requestFromProfile(context, name);
		} else {
			const result = await NatalIntake.process(rest, undefined, "soul");
			if (result.kind === "help") {
				return soulUsage;
			}
			request = result.request;
		}
	}

	const ephemeris = new CaelusEphemeris();
	const natal = ephemeris.chartAt(
		request.birth.jdUt,
		request.birth.lat,
		request.birth.lon,
		{ houseSystem: request.options.houseSystem },
	);
	const bodies = natal.bodies;
	const cusps = natal.cusps;

	const nn = bodies.true_node ?? bodies.mean_node;
	const soulReading = computeSoulReading(bodies, cusps, nn?.lon);
	const nodalReading = computeNodalReading(bodies, cusps);

	if (!soulReading || !nodalReading) {
		throw new AxiError(
			"Could not compute evolutionary soul reading",
			"CALCULATION_ERROR",
			["Ensure birth coordinates and ephemeris are available"],
		);
	}

	const sun = bodies.sun;
	const moon = bodies.moon;
	const phase =
		sun && moon ? computeSolLunaPhase(sun.lon, moon.lon).name : "Balsamic";

	const clientName = clientId ?? "inline";
	const ppp = soulReading.ppp;
	const pluto = soulReading.pluto;
	const nnObj = nodalReading.northNode;
	const snObj = nodalReading.southNode;

	const skipped =
		nodalReading.skippedSteps.length > 0 ? nodalReading.skippedSteps : 0;

	return {
		soul: {
			client: clientName,
			pluto: `${pluto.sign}/H${pluto.house}`,
			ppp: ppp.active ? `${ppp.sign}/H${ppp.house}` : ppp.description,
			southNode: `${snObj.sign}/H${snObj.house}`,
			northNode: `${nnObj.sign}/H${nnObj.house}`,
			phase,
		},
		evolutionaryMechanics: {
			pppActive: ppp.active,
			plutoNodeMidpoint:
				soulReading.plutoNorthNodeMidpoint?.formatted ?? "none",
			nodeMotion: nodalReading.motionStatus,
			plutoStressful: pluto.stressfulAspects,
			plutoNonstressful: pluto.nonstressfulAspects,
			skippedSteps: skipped,
			nodalRulers: {
				southNodeRuler:
					nodalReading.southNode.rulerPlacement?.description ?? "none",
				northNodeRuler:
					nodalReading.northNode.rulerPlacement?.description ?? "none",
			},
			...(isFull
				? {
						dispositorChains: {
							pluto: soulReading.dispositorChain,
							southNodeRuler: nodalReading.dispositorChains.southNodeRuler,
							northNodeRuler: nodalReading.dispositorChains.northNodeRuler,
						},
						plutoAspects: pluto.aspects,
						nodeAspects: {
							northNode: nnObj.aspects,
							southNode: snObj.aspects,
						},
						prenatalEclipses: computePrenatalEclipses(
							ephemeris,
							request.birth,
							natal.cusps,
							request.options.houseSystem,
							request.options.topocentric,
						),
					}
				: {}),
		},
		help: [
			`Run \`lumen soul ${clientName} --full\` for dispositor chains and fine orbs`,
			`Run \`lumen consulta abrir ${clientName} --motivo "..."\` to begin consultation`,
		],
	};
};
