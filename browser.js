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

let rows = Array.from(temp0.querySelectorAll("tr"));
rows.pop();

let data = [];
for (let row of rows) {
	let cells = row.children

	let date = cells[0].innerText.trim().substr(0, 11) /*Assuming date is dd-mmm-yyyy*/;
	let text = cells[1].innerText.trim();
	let debit = parseFloat(cells[3].innerText.trim().replace(",","")) || 0;
	let credit = parseFloat(cells[4].innerText.trim().replace(",","")) || 0;
	let balance = parseFloat(cells[5].innerText.trim().replace(",","")) || 0;

	let type = "";

	if (text.includes("HungerBox") || text.includes("Daalchini/PYTM")) {
		type = "Food/Riviera";
	} else if (text.includes("Mr SAGAR/PYTM") || text.includes("RAJU KUM/YESB")) {
		type = "Food/Outside";
	} else if (text.includes("SASTA MA/HDFC") || text.includes("B SUMIYY/YESB")) {
		type = "Food/Fruits";
	} else if (text.includes("NETFLIX")) {
		type = "Entertainment/Netflix";
	} else if (text.includes("NEXTBILLION TECH")) {
		type = "Invest/Groww";
	} else if (text.includes("Bangalor/INDB")) {
		type = "Travel/Metro";
	} else if (text.includes("TSF Food/PYTM")) {
		type = "Shopping/ISCON";
	} else if (text.includes("Infiniti/ICIC/tata")) {
		type = "Shopping/Croma";
	} else if (text.includes("IRCTC Ap")) {
		type = "Travel/IRCTC";
	} else if (text.includes("IBM INDIA PRIVAT")) {
		type = "Salary";
	} else if (text.includes("TO TRANSFER Debit account")) {
		type = "Invest/Fixed Deposit";
	} else if (text.includes("ICIC/bsestarmfr")) {
		type = "Invest/Mutual Fund";
	} else if (text.includes("WDL ATM CASH")) {
		type = "ATM_Withdrawal";
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
