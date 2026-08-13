import type { AxiCliCommand } from "axi-sdk-js";
import { computeChart } from "../lib/compute";
import { assertKnownFlags, parseFlags } from "../lib/flags";
import { resolveNatalRequest } from "../lib/intake";
import { formatChart } from "../lib/output";
import { chartFlagSpec } from "../lib/schema";

export const chartUsage = [
	'lumen chart --when 1981-01-26T00:50 --place "Magangué, Colombia"',
	"",
	"Birth:",
	"  --when                                    Flexible date/time: 1981-01-26T00:50 | 26/01/1981 00:50 | 1981-01-26",
	"  --place                                   Place name, geocoded to lat/lon/zone (needs network)",
	"  --year, --month, --day, --hour, --minute   Alternative to --when (local clock time)",
	"  --second                                   Seconds (default 0)",
	"  --lat, --lon                               Birthplace coordinates (lon east-positive); alternative to --place",
	"  --zone                                     Optional IANA timezone override",
	"Options:",
	"  --house-system                             placidus (default) | porphyry | equal | whole_sign | ...",
	"  --zodiac                                   tropical (default) | sidereal:lahiri | ...",
	"  --node                                     both (default) | mean | true",
	"  --bodies                                   Extra bodies, comma-separated: mean_lilith,true_lilith",
	"  --topocentric                              Enable topocentric parallax",
].join("\n");

export const chartCommand: AxiCliCommand<void> = async (args) => {
	const parsed = parseFlags(args);

	if (parsed.flags.has("help")) {
		return chartUsage;
	}

	assertKnownFlags(parsed, chartFlagSpec, "chart");

	const { values, flags } = parsed;
	const request = await resolveNatalRequest(values, flags);
	const chart = computeChart(request);

	return formatChart(chart, request);
};
