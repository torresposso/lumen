#!/usr/bin/env bun
import { tryFastPath } from "axi-sdk-js/fast-path";
import { VERSION } from "../src/version";

if (!tryFastPath(process.argv.slice(2), { version: VERSION })) {
	const { main } = await import("../src/cli");
	await main();
}
