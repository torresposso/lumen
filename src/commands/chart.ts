import type { AxiCliCommand } from "axi-sdk-js";
import { resolveNatalRequestFromArgs } from "../cli/intake";
import { formatChart } from "../cli/output";
import { computeChart } from "../core/chart-engine";

export const chartUsage = [
	'lumen chart --when 1981-01-26T00:50 --place "Magangué, Colombia"',
	"",
	"Birth:",
	"  --when                                    Flexible date/time: 1981-01-26T00:50 | 26/01/1981 00:50 | 1981-01-26",
	"  --place                                   Place name, geocoded to lat/lon/zone (needs network)",
	"  --year, --month, --day, --hour, --minute   Alternative to --when (local clock time)",
	"  --lat, --lon                               Birthplace coordinates (lon east-positive); alternative to --place",
	"  --zone                                     Optional IANA timezone override",
	"Options:",
	"  --house-system                             placidus (default) | porphyry | equal | whole_sign | ...",
	"  --zodiac                                   tropical (default, Western astrology)",
	"  --node                                     both (default) | mean | true",
	"  --bodies                                   Extra bodies, comma-separated: mean_lilith,true_lilith",
	"  --topocentric                              Enable topocentric parallax",
	"  --draconic                                 Re-project chart onto lunar-node zodiac (0° Aries North Node)",
	"  --eclipses                                 Include prenatal solar and lunar eclipses",
	"  --lots                                     Include Hermetic Lots (Lot of Spirit, Lot of Fortune)",
	"  --stars                                    Include major Fixed Star conjunctions (orb <= 1.5°)",
	"  --evolutionary                             Include Jeffrey Wolf Green evolutionary triad & skipped steps",
].join("\n");

export const chartCommand: AxiCliCommand<
	string | import("../cli/output").ChartOutput
> = async (args) => {
	const result = await resolveNatalRequestFromArgs(args);

	if (result.kind === "help") {
		return chartUsage;
	}

	const chart = computeChart(result.request);
	return formatChart(chart, result.request);
};
