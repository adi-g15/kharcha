let total_expense = {};
let will_be_back = {};
let longterm = {};
let special_expense = {};

function detailedSummary(data) {
	for (let e of data)
		if(!e.ignore && e.type != "comment") {
			total_expense[e.type] = 0;
			will_be_back[e.type] = 0;
			longterm[e.type] = 0;
		}

	for (let e of data)
		if(!e.ignore && e.type != "comment") {
			total_expense[e.type] = parseFloat( (total_expense[e.type] + e.debit - e.credit).toFixed(2) );
			will_be_back[e.type] += (e.will_be_back || 0);
			if(e.longterm)
				longterm[e.type] += e.debit-e.credit;
		}
}

/*
 * @note It doesn't take into account any complex handling, such as
 *       it does NOT take into account the fact that it is "ignore: true"
 *       it does NOT take into account the fact that it is "type: comment"
 *       it does NOT take into account the fact that it is "will_be_back"
 *       it does NOT take into account the fact that it is "longterm"
 *       it does NOT take into account the fact that it is "ignore: true"
 *       it does NOT take into account the fact that it is "type: comment"
 *
 *       Do that yourself before passing the data array here
 * */
function getBriefSummary(dataArr, fieldName, reducerFn) {
	let obj = {}

	if ( !reducerFn ) {
		// @note that both arguments in reducerFn have different types
		if ( !fieldName ) {
			// if fieldName not provided, go by the simple debit/credit logic
			reducerFn = (sum, expenseObj) => parseFloat( (sum + expenseObj["debit"] - expenseObj["credit"]).toFixed(2) )
		} else {
			reducerFn = (sum, expenseObj) => parseFloat( (sum + (expenseObj[fieldName] || 0)).toFixed(2) )
		}
	}

	for (let e of dataArr) {
		const idx = e["type"].indexOf("/")
		const type = (idx == -1) ? e["type"] : e["type"].substr(0, idx)

		obj[type] = reducerFn(obj[type] || 0, e)
	}

	return obj;
}

function briefSummary(data) {
	total_expense = getBriefSummary(
		data.filter(
			e => !e.ignore &&
			e["type"] != "comment" &&
			e["type"] != "Salary" &&
			e["type"] != "Invest/Withdraw" &&
			e["type"] != "Lent/Repaid" &&
			!e["prev_leftover"] &&
			!e["special_expense"]
		), ""
	)

	will_be_back = getBriefSummary(data, "will_be_back")

	longterm = getBriefSummary(
		data.filter(e => e.longterm == true), ""
	);

	special_expense = getBriefSummary(
		data.filter(e => e.special_expense === true), ""
	);
}

function getSalary(data) {
	let salary = 0;

	for(let e of data)
		if(e.type == "Salary")
			salary += e.credit;

	return salary;
}

export function kharchaAnalysis(data, is_detailed) {
	if (is_detailed)
		detailedSummary(data);
	else
		briefSummary(data)
	
	let salary = getSalary(data)

	// irrespective of "ignore", so can add custom entities to add prev_leftovers
	let leftover_summary = getBriefSummary(
			data.filter(e => e.prev_leftover == true), "",
			(sum, expenseObj) => parseFloat( (sum + expenseObj["credit"] - expenseObj["debit"]).toFixed(2) )
	)
	let prev_leftover = Object.values(leftover_summary).reduce((a, b) => parseFloat((a + b).toFixed(2)), 0)

	let invest_withdraw_summary = getBriefSummary(
			data.filter(e => e.type == "Invest/Withdraw"), "",
			(sum, expenseObj) => parseFloat( (sum + expenseObj["credit"] - expenseObj["debit"]).toFixed(2) )
	)
	let invest_withdrawal = Object.values(invest_withdraw_summary).reduce((a, b) => (a + b), 0)

	let lent_repaid_summary = getBriefSummary(
			data.filter(e => e.type == "Lent/Repaid"), "",
			(sum, expenseObj) => parseFloat( (sum + expenseObj["credit"] - expenseObj["debit"]).toFixed(2) )
	)
	let lent_repaid = Object.values(lent_repaid_summary).reduce((a, b) => (a + b), 0)

	let total_out = parseFloat((
		Object.values(total_expense).reduce((a, b) => a + b, 0) +
		Object.values(special_expense).reduce((a, b) => a + b, 0) -
		Object.values(will_be_back).reduce((a, b) => a + b, 0)
	).toFixed(2));

	// Today's date (dd/mm/yyyy)
	console.log("# " + new Date().toLocaleDateString("en-IN"));
	console.log("=========================================");
	console.log("\n```");
	console.log("Salary: " + salary);
	console.log("Prev Month Leftover: " + prev_leftover);

	for (let [key, value] of Object.entries(leftover_summary)) {
		console.log("\t" + key + ": " + value);
	}

	console.log("");
	console.log("Total In: " + (salary + prev_leftover + invest_withdrawal + lent_repaid).toFixed(2));
	console.log("Total Out: " + total_out);

	for (let [key, value] of Object.entries(special_expense)) {
		console.log("\t" + key + ": " + value)
	}

	console.log("");
	console.log("Longterm expense: " + parseFloat( Object.values(longterm).reduce((a, b) => a + b, 0).toFixed(2) ));
	console.log("--------------------\n");

	// @ref: stackoverflow.com/a/38446764
	const now = new Date();
	const days_in_month = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();

	let daily_expense = [];
	for (let i=0; i<days_in_month; ++i) daily_expense[i] = 0;

	// filter 0 values
	for (let [key, value] of Object.entries(total_expense)) {
		if (value == 0) delete total_expense[key]
	}

	let sum = 0;
	// Object.entries returns array of pairs, sort it in descending order
	let total_expense_arr = Object.entries(total_expense).sort((a,b) => b[1]-a[1])
	for (let key of total_expense_arr.map(entry => entry[0])) {
	if (will_be_back[key] > 0 || longterm[key] > 0) {
		process.stdout.write(key + ": " + total_expense[key] + "\t( ");

		if (will_be_back[key] > 0) process.stdout.write("-" + will_be_back[key]);
		if (will_be_back[key] > 0 && longterm[key] > 0) process.stdout.write(" , ");

		// '*' is used to indicate longterm expense
		if (longterm[key] > 0) process.stdout.write("*" + (longterm[key] - will_be_back[key]));

		console.log(" )");
	} else {
		console.log(key + ": " + total_expense[key]);
	}

	sum = parseFloat( (sum + total_expense[key] - will_be_back[key]).toFixed(2) );
	console.log("\t", sum);
    }

	console.log("```");
}

