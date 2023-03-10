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

let total_expense = {};
let will_be_back = {};
let longterm = {};

function detailedSummary() {
    for (let e of data) if(!e.ignore && e.type != "comment") { total_expense[e.type] = 0; will_be_back[e.type] = 0; longterm[e.type] = 0; }
    for (let e of data) if(!e.ignore && e.type != "comment") { total_expense[e.type] = parseFloat( (total_expense[e.type] + e.debit - e.credit).toFixed(2) ); will_be_back[e.type] += (e.will_be_back || 0); if(e.longterm) longterm[e.type] += e.debit-e.credit; }
}

function briefSummary() {
    for (let e of data) if(!e.ignore && e.type != "comment") {
	    const idx = e.type.indexOf("/")
	    const type = e.type.substr(0, (idx != -1) ? idx: e.type.length)
	    total_expense[type] = 0;
	    will_be_back[type] = 0
	    longterm[type] = 0
    }
    for (let e of data) if(!e.ignore && e.type != "comment") {
	    const idx = e.type.indexOf("/")
	    const type = e.type.substr(0, (idx != -1) ? idx: e.type.length)
	    total_expense[type] = parseFloat( (total_expense[type] + e.debit - e.credit).toFixed(2) );
	    will_be_back[type] += (e.will_be_back || 0);
	    if(e.longterm) longterm[type] = parseFloat( (longterm[type] + e.debit - e.credit).toFixed(2) );
    }
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

function getPrevMonthLeftOver() {
    let prev_leftover = 0;

    for (let e of data) {
	// irrespective of "ignore", so can add custom entities to add prev_leftovers
	if (e.prev_leftover == true) {
	    prev_leftover += e.credit - e.debit;
	}
    }

    return prev_leftover;
}

function main() {
    if (detailed) detailedSummary();
    else briefSummary()

    let salary = getSalary()
    let prev_leftover = getPrevMonthLeftOver();
    let total_out = parseFloat( (Object.values(total_expense).reduce((a, b) => a + b, 0) - Object.values(will_be_back).reduce((a, b) => a + b, 0)).toFixed(2) );

    // Today's date (dd/mm/yyyy)
    console.log("# " + new Date().toLocaleDateString("en-IN"));
    console.log("=========================================");
    console.log("\n```");
    console.log("Salary: " + salary);
    console.log("Prev Month Leftover: " + prev_leftover);
    console.log("");
    console.log("Total In: " + (salary + prev_leftover));
    console.log("Total Out: " + total_out);
    console.log("");
    console.log("Longterm expense: " + parseFloat( (Object.values(longterm).reduce((a, b) => a + b, 0) - Object.values(will_be_back).reduce((a, b) => a + b, 0)).toFixed(2) ));
    console.log("--------------------\n");

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

    // assert sum == total_out
    if (sum != total_out) {
	console.error("Error: Sum not equal to total_out");
    }
}

main()
