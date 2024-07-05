import { mkdtemp, writeFileSync } from "fs";

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

export function assignTypes(data) {
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

		entry["longterm"] = type.startsWith("Invest") ? true: undefined;
		entry["type"] = type || "";

		if (special_expense_types.some(regexp => regexp.test(entry["type"]))) {
			entry["special_expense"] = true;
		}
	}

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
