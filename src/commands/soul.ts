import type { AxiCliCommand } from "axi-sdk-js";
import { AxiError } from "axi-sdk-js";
import { CaelusEphemeris } from "../adapters/ephemeris-gateway";
import { computeNodalReading, computePrenatalEclipses } from "../core/nodes";
import { computeSolLunaPhase } from "../core/phases";
import { computeSoulReading } from "../core/soul";
import type { CliContext } from "./intake";
import {
	NatalIntake,
	type NatalRequest,
	requestFromProfile,
	takeProfileArg,
} from "./intake";

export const soulUsage = [
	"lumen soul <profile> [--full]",
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

	let profileId: string | undefined;
	let request: NatalRequest;

	const first = filteredArgs[0];
	if (first !== undefined && !first.startsWith("-")) {
		// Positional profile id
		profileId = first;
		const rest = filteredArgs.slice(1);
		if (rest.length > 0) {
			throw new AxiError(
				"Cannot combine positional profile id with extra flags",
				"VALIDATION_ERROR",
				[`Use \`lumen soul ${profileId}\` or inline birth flags`],
			);
		}
		request = requestFromProfile(context, profileId);
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
			profileId = name;
			request = requestFromProfile(context, name);
		} else {
			const result = await NatalIntake.process(
				rest,
				undefined,
				"soul",
				context?.config,
			);
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

	const nn = bodies.true_node;
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

	const profileName = profileId ?? "inline";
	const ppp = soulReading.ppp;
	const pluto = soulReading.pluto;
	const nnObj = nodalReading.northNode;
	const snObj = nodalReading.southNode;

	const skipped =
		nodalReading.skippedSteps.length > 0 ? nodalReading.skippedSteps : 0;

	const p2 = (n: number) => String(n).padStart(2, "0");
	const birth = request.birth;
	const inlineFlags = [
		`--when "${birth.local.year}-${p2(birth.local.month)}-${p2(birth.local.day)}T${p2(birth.local.hour)}:${p2(birth.local.minute)}"`,
		...(birth.zone ? [`--zone "${birth.zone}"`] : []),
		`--lat ${birth.lat}`,
		`--lon ${birth.lon}`,
	].join(" ");

	return {
		soul: {
			profile: profileName,
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
		help: profileId
			? [
					`Run \`lumen soul ${profileId} --full\` for dispositor chains and fine orbs`,
				]
			: [
					`Run \`lumen soul ${inlineFlags} --full\` for dispositor chains and fine orbs`,
					`Run \`lumen profile add <id> ${inlineFlags}\` to save this profile`,
				],
	};
};
