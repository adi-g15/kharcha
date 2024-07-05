import { parse as csvParse } from "csv-parse/sync";

export function hdfc_convert_to_ir(content) {
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

	return ir_records;
}

