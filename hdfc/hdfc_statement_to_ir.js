#!/usr/bin/env node

import { parse as csvParse } from "csv-parse/sync";
import { readFileSync, writeFileSync, mkdtemp } from "fs";

const statement_file = process.argv[2];

if (!statement_file) {
        console.error("Require a file to process. Download statement in CSV format from HDFC website.");
        process.exit(1);
}

let content = readFileSync(statement_file).toString();

/* hdfc statement had an empty line in beginning, strip content */
content = content.trim();

let records = csvParse(content, {bom: true, trim: true});

/* ignore 1st record, as it's headers */
records.shift();

/* IR -> Intermediate Representation, which is JSON in our case */
const ir_records = records.map(record => ({
	/* type will be assigned by backend */
	date: record[0],
	text: record[1],
	debit: Number(record[3]),
	credit: Number(record[4]),
	ref_number: record[5],
	balance: Number(record[6]),
}));

/* TODO: Temporary, remove in future */
mkdtemp("temp-", (err, folder) => {
	if (err) {
		console.error(err);
	} else {
		const json_filepath = folder + "/data.json";
		console.log("JSON records saved to: ", json_filepath);
		writeFileSync(json_filepath, JSON.stringify(ir_records, null, 4));
	}
})

