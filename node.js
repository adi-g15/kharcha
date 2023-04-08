#!/usr/bin/env node

if (!process.argv[2]) {
	console.error("Require a file to process");
	process.exit(1)
}

let detailed = false;
if(!!process.argv[3]) {
	detailed = true;
}

var data = require((process.argv[2][0] == "/" ? "":"./") + process.argv[2]);

function preProcessData() {
	for (let entry of data) {
		entry["debit"] = entry["debit"] || 0;
		entry["credit"] = entry["credit"] || 0;

		if (entry["type"] === "Rent") {
			entry["big_expense"] = true;
		}
	}
}

preProcessData();

let total_expense = {};
let will_be_back = {};
let longterm = {};
let big_expense = {};

function detailedSummary() {
    for (let e of data) if(!e.ignore && e.type != "comment") { total_expense[e.type] = 0; will_be_back[e.type] = 0; longterm[e.type] = 0; }
    for (let e of data) if(!e.ignore && e.type != "comment") { total_expense[e.type] = parseFloat( (total_expense[e.type] + e.debit - e.credit).toFixed(2) ); will_be_back[e.type] += (e.will_be_back || 0); if(e.longterm) longterm[e.type] += e.debit-e.credit; }
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
 *
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

function briefSummary() {
	total_expense = getBriefSummary(
		data.filter(e => !e.ignore && e["type"] != "comment" && e["type"] != "Salary" && !e["prev_leftover"] && !e["big_expense"]), ""
	)

	will_be_back = getBriefSummary(data, "will_be_back")

	longterm = getBriefSummary(
		data.filter(e => e.longterm == true), ""
	);

	big_expense = getBriefSummary(
		data.filter(e => e.big_expense === true), ""
	);
}

function getSalary() {
    let salary = 0;

    for(let e of data) {
	if(e.type == "Salary") {
	    salary += e.credit;
	}
    }

    return salary;
}

function main() {
    if (detailed) detailedSummary();
    else briefSummary()

    let salary = getSalary()

	// irrespective of "ignore", so can add custom entities to add prev_leftovers
	let leftover_summary = getBriefSummary(
			data.filter(e => e.prev_leftover == true), "",
			(sum, expenseObj) => parseFloat( (sum + expenseObj["credit"] - expenseObj["debit"]).toFixed(2) )
	)
    let prev_leftover = Object.values(leftover_summary).reduce((a, b) => parseFloat((a + b).toFixed(2)), 0)

    let total_out = parseFloat((
		Object.values(total_expense).reduce((a, b) => a + b, 0) +
		Object.values(big_expense).reduce((a, b) => a + b, 0) -
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
    console.log("Total In: " + (salary + prev_leftover));
    console.log("Total Out: " + total_out);

	for (let [key, value] of Object.entries(big_expense)) {
		console.log("\t" + key + ": " + value)
	}

    console.log("");
    console.log("Longterm expense: " + parseFloat( Object.values(longterm).reduce((a, b) => a + b, 0).toFixed(2) ));
    console.log("--------------------\n");

	// filter 0 values
	for (let [key, value] of Object.entries(total_expense)) {
		if (value == 0) delete total_expense[key]
	}

    let sum = 0;
    for (let key of Object.keys(total_expense).sort()) {
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

main()
