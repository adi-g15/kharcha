(function () {
// To run on website console

// If temp0 is not defined, attempt to find it
if (!temp0) {
	var temp0 = document.querySelector("table.table.table-hover.table-bordered.content_table.table-striped tbody")

	// If temp0 is still not defined, then don't continue with declaring the variables
	if (!temp0) {
		/*Use "Use in Console" option on the <tbody> of the table*/
		throw "temp0 is not defined";
	}
}

let merchants = {
	"HungerBox": "Food/Riviera",
	"Daalchini/PYTM": "Food/Riviera",
	"Mr SAGAR/PYTM": "Food/Outside",
	"RAJU KUM/YESB": "Food/Outside",
	"SASTA MA/HDFC": "Food/Fruits",
	"B SUMIYY/YESB": "Food/Fruits",
	"SIVANANT": "Food/Fruits",
	"SADAM S": "Food/Fruits",
	"NETFLIX": "Entertainment/Netflix",
	"NEXTBILLION TECH": "Invest/Groww",
	"BMTC BUS": "Travel/Bus",
	"Bangalor/INDB": "Travel/Metro",
	"TSF Food/PYTM": "Shopping/ISCON",
	"Infiniti/ICIC/tata": "Shopping/Croma",
	"IRCTC Ap": "Travel/IRCTC",
	"IBM INDIA PRIVAT": "Salary",
	"TO TRANSFER Debit account": "Invest/Fixed Deposit",
	"ICIC/bsestarmfr": "Invest/Mutual Fund",
	"WDL ATM CASH": "CashWithdrawal",
};

let rows = Array.from(temp0.querySelectorAll("tr"));
rows.pop();

let data = [];
for (let row of rows) {
	let cells = row.children

	let date = cells[0].innerText.trim().substr(0, 11) /*Assuming date is dd-mmm-yyyy*/;
	let text = cells[1].innerText.trim();
	let debit = parseFloat(cells[3].innerText.trim().replaceAll(",","")) || 0;
	let credit = parseFloat(cells[4].innerText.trim().replaceAll(",","")) || 0;
	let balance = parseFloat(cells[5].innerText.trim().replaceAll(",","")) || 0;

	let type = "";

	for (let key in merchants) {
		if (text.includes(key)) {
			type = merchants[key]
		}
	}

	data.push({
		date,
		text,
		debit,
		credit,
		balance,
		type,
		longterm: (type.startsWith("Invest") ? true: undefined),
	});
}

if (data.length > 0 && data[0].type == "Salary") {
	// Remove Salary Credit entry
	data[0]["ignore"] = true
}

// print `data` array in console
return data;
}());

