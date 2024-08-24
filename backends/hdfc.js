import { parse as csvParse } from "csv-parse/sync";

/* convert CSV credit card statement from HDFC mobile app */
function hdfc_cc_convert_to_ir(content) {
	const start_idx = content.indexOf("Transaction type~")
	const end_idx = content.lastIndexOf("Opening Bal~")

	/* actual CSV table starts from here */
	content = content.substring(start_idx, end_idx).trim()
	
	const records = csvParse(content, {
		bom: true,
		columns: true,
		/* delimiter in HDFC CSV statement is `~` */
		delimiter: "~",
		skip_empty_lines: true,
		trim: true,
	});

	/* ignore only the first credit looking like bill payment */
	let first_bill_payment_ignored = false;
	let bill_payment_type = "FirstBillPayment";

	const ir_records = records.map(record => {
		const is_credit = (record["Debit / Credit"] == "Cr");
		const amount = Number(record["AMT"].replaceAll(',', ''))

		let is_bill_payment = is_credit &&
			(record["Description"].includes("NETBANKING TRANSFER") ||
				record["Description"].startsWith("IMPS PMT "));

		if (is_bill_payment && first_bill_payment_ignored)
			bill_payment_type = "BillPayment";	/* normal bill payments */

		if (is_bill_payment && (! first_bill_payment_ignored))
			first_bill_payment_ignored = true;

		return {
			date: record["DATE"],
			text: record["Description"],
			debit: is_credit ? 0: amount,
			credit: is_credit ? amount: 0,

			/* force 'type' to be different */
			...(is_bill_payment ? {
				type: bill_payment_type
			}: {}),

			/* additional fields */
			reward_points: record["Feature Reward Points"],
		};
	});

	return ir_records;
}

export function hdfc_convert_to_ir(content) {
	/* hdfc statement had an empty line in beginning, strip content */
	content = content.trim();

	/* Check whether it's a credit card statement */
	if (content.startsWith("Name")) {
		return hdfc_cc_convert_to_ir(content);
	}
	
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

		/* additional fields */
		ref_number: record[5],
		balance: Number(record[6]),
	}));

	return ir_records;
}

