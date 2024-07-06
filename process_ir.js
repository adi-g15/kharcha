import { mkdtemp, writeFileSync } from "fs";
import { askBam } from "./ai_ask.js";

const merchants = {
	"WDL ATM CASH": "CashWithdrawal",

	"PVR Elan": "Entertainment/Movie",

	"B SUMIYY/YESB": "Food/Fruits",
	"SADAM S": "Food/Fruits",
	"SASTA MA/HDFC": "Food/Fruits",
	"SIVANANT": "Food/Fruits",
	"SRI GANE/PYTM": "Food/Juice",
	"SRI GANESH FRUIT JUI": "Food/Juice",
	"NANDINI-PAYTMQR": "Food/Milk",
	"Dudh": "Food/Milk",
	"Milk": "Food/Milk",
	"MILK": "Food/Milk",
	"CURD": "Food/DailyEssentials",
	"EGG": "Food/DailyEssentials",
	"Ande": "Food/DailyEssentials",
	"ANDE": "Food/DailyEssentials",
	"MITHAI": "Food/Outside",
	"Daalchini/PYTM": "Food/Riviera",
	"KRISHNA SAGAR": "Food/Outside",
	"Mr SAGAR/PYTM": "Food/Outside",
	"RAJU KUM/YESB": "Food/Outside",
	"HungerBox": "Food/Riviera",

	"BECHU SAH/SBIN/9795": "Home",

	"for TDR": "Invest/FD",
	"ICIC/bsestarmfr": "Invest/MF",
	"ICCLGROWW-GROWW-BS": "Invest/Groww",
	"Nextbill/HDFC/groww.razo/Pay": "Invest/Groww",
	"Nextbill/ICIC/groww.razo/Pay": "Invest/Groww",
	"NEXTBILLION TECH": "Invest/Groww",
	"Indian Clearin": "Invest/Groww",
	"INDIAN CLEARIN": "Invest/Groww",
	"RDInstallment": "Invest/RD",
	"RD INSTALLMENT": "Invest/RD",
	"WITHDRAWAL TRANSFER": "Invest/RD",

	"G GOPALA/PYTM/pay": "Looks/Haircut",

	"CAKE": "Misc",
	"TOP UP": "Misc",

	"IBM INDIA PRIVAT": "Salary",
	"ADITYA  GUPTA-AG": "Salary/SelfTransfer",

	"DECATHLO/HDFC/decathlon": "Shopping/Decathlon",
	"DMART SRINI": "Shopping/DMART",
	"DmartIndia": "Shopping/DMART",
	"Infiniti/ICIC/tata": "Shopping/Croma",
	"MORE RET/ICIC/MoreRetail": "Shopping/More",
	"RELIANCE/ICIC/jiomartgro/JIO20": "Shopping/JioMart",
	"TSF Food/PYTM": "Shopping/ISCON",

	"Google P": "Subscription/GoogleOne",
	"NETFLIX": "Subscription/Netflix",

	"Bangalor/INDB": "Travel/Metro",
	"BMTC BUS": "Travel/Bus",
	"BMTC20.rzp": "Travel/Bus",
	"IRCTC Ap": "Travel/IRCTC",
	"Rapido/UTIB/rapid": "Travel/Rapido",
	"Roppen20/PYTM/pay": "Travel/Rapido",
	"Roppen T": "Travel/Rapido"
};

/* Assign 'type' label using AI. Will NOT overwrite 'type' labels if
 * already tagged. Suggested to pass some entries with already labelled
 * 'type', that helps the AI to create better type labels
 * 'untagged_records' is modified in-place
 */
async function assignTypesWithAI(untagged_records) {
	/* if the array is empty, no need to bother AI */
	if (untagged_records.length === 0)
		return;

	/* only pass relevant fields to AI, doesn't need to pass everything */
	const smaller_data = untagged_records.map((record,idx) => ({
		/* will use this id to assign types to the original array later */
		id: idx,
		message: record["text"],
		debit: record["debit"] || undefined,
		credit: record["credit"] || undefined
	}))

	console.log("Asking AI to tag the data. Please wait...")

	const response = await askBam(
		"Given these list of JSON objects having details of UPI transactions," +
		" categorise them into categories such as 'Food', 'Investment'," +
		" 'Entertainment', 'Travel', 'Shopping', or 'Misc' for small" +
		" transactions not fitting in other categories, and reply with" +
		" list of JSON objects, along with a 'type' key in each object" +
		" To do so, use context from the message in the upi transaction," +
		" such as 'idli'/'milk'/'eggs'/'ande' etc are food, groww is" + 
		" investment, pvr or movie tickets are entertainment, bus or metro or" +
		" royalbrothers or rapido is travel, etc." +
		" Print a list of JSON objects, along with 'type' key in each object." +
		" Don't print anything else than a list of JSON objects." +
		"\n" +

		JSON.stringify(smaller_data, null, 0)
	)

	console.debug(response);

	let response_json = null;

	if (response) {
		//const json_obj_pattern = /\{(\s*([\w]+)\s*:\s*([^,]*),)?\s*}/g;
		const json_obj_pattern = /\{.*}/g;
		response_json = response.match(json_obj_pattern);
		console.log(response_json)
	}

	if (!response_json || !Array.isArray(response_json)) {
		console.warn("Failed to ask AI for categorising transactions.");
		console.warn("Ensure you have BAM_API_TOKEN in .env");
	} else {
		response_json.forEach(record => {
			const idx = record["id"];
			if (untagged_records[idx]["type"] == "")
				untagged_records[idx]["type"] = record["type"];
		})
	}
}

export async function assignTypes(data) {
	// these are to be used for big spends/home
	const special_expense_types = [/^Home/, /^Rent$/];

	for (let entry of data) {
		entry["debit"] = entry["debit"] || 0;
		entry["credit"] = entry["credit"] || 0;

		const {text, debit, credit} = entry;
		let type = entry["type"]

		if (!type) {
			for (let key in merchants) {
				if (text.includes(key)) {
					type = merchants[key]
				}
			}
		}

		// If type still not assigned, just ignore small values
		if (!type) {
			if (((debit == 0) && (credit <= 20)) ||
				((debit <= 20) && (credit == 0))) {
				type = "Misc";
			}
		}

		if (type && type.startsWith("Invest"))
			entry["longterm"] = true;

		entry["type"] = type || "";

		if (special_expense_types.some(regexp => regexp.test(entry["type"]))) {
			entry["special_expense"] = true;
		}
	}

	/* ask AI also for tagging */
	const ai_input = [
		...data.filter(record => 
			(!record["type"] || (record["type"] == "")
		)),
		/*giving 6 entries of tagged data*/
		...data.sort(() => 0.5 - Math.random()).filter(record => record["type"] != "").splice(0, 6)
		]
	await assignTypesWithAI(ai_input);

	return data
}

export function saveDataInFile(data) {
	mkdtemp("temp-", (err, folder) => {
		if (err) {
			console.error(err);
		} else {
			const json_filepath = folder + "/data.json";
			console.log("Updated records saved to: ", json_filepath);
			writeFileSync(json_filepath, JSON.stringify(data, null, 4));
		}
	})
}
