#!/bin/env node

import asciichart from "asciichart";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { exit } from "process";
import { readFileSync } from "fs";
import { hdfc_convert_to_ir } from "./backends/hdfc.js";
import { sbi_convert_to_ir } from "./backends/sbi.js";
import { kharchaAnalysis } from "./analyser.js";
import { assignTypes, saveDataInFile } from "./process_ir.js";

/* hideBin removes the 'node' and 'script' path from argv, basically
 * initial 2 args, helps in reading args._ later*/
const args = yargs(hideBin(process.argv))
	.option("detailed", {
		describe: "Enable detailed report",
		type: "boolean"
	})
	.option("sbi", {
		describe: "Input is SBI Statement (JSON)",
		type: "boolean"
	})
	.option("hdfc", {
		describe: "Input is HDFC Statement (CSV)",
		type: "boolean"
	})
	.option("json", {
		describe: "Provide a JSON file for analysis", /* should be in IR form */
		type: "string"
	})
	.help()
	.parse();

if (!args.sbi && !args.hdfc && !args.json) {
	console.error("One of '--sbi' / '--hdfc' / '--json' is required");
	exit(1);
}

/* STAGE 0 - Input (JSON or any filepath passed without option) */
const input_file = args.json || args._[0];

if (!input_file) {
	console.error("Please pass a statement's filename");
	process.exit(1)
}

const stage0_output = readFileSync(input_file).toString();

/* STAGE 1 - Convert to JSON (our IR) */
/*
 * Every backend should give us data in our IR
 * (Intermediate Representation), which is an array of
 * JSON objects with these keys at minimum:
 *
 * {
 *	date: String,
 *	text: String,
 *	debit: Number,
 *	credit: Number,
 *	balance: Number,
 *  ... any other keys/data is also okay
 *	}
 * */
const stage1_input = stage0_output;
let stage1_output = null;
if (args.json) {
	/* In case of directly passed JSON, skip Stage 1 */
	stage1_output = JSON.parse(stage1_input);
} else if (args.hdfc) {
	stage1_output = hdfc_convert_to_ir(stage1_input);
} else if (args.sbi) {
	stage1_output = sbi_convert_to_ir(stage1_input);
}

/* STAGE 2 - Assign Types */
const stage2_input = stage1_output;
const stage2_output = await assignTypes(stage2_input);
saveDataInFile(stage2_output);

/* Stage 3 - Analysis */
kharchaAnalysis(stage2_output, args.detailed);

