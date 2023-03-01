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

let total = {};

function detailedSummary() {
    for (let e of data) if(!e.ignore) total[e.type] = 0;
    for (let e of data) if(!e.ignore) total[e.type] += e.debit - e.credit;
}

function briefSummary() {
    for (let e of data) if(!e.ignore) total[e.type.substr(0, (e.type.indexOf("/")!=-1)?e.type.indexOf("/"):e.type.length)] = 0;
    for (let e of data) if(!e.ignore) total[e.type.substr(0, (e.type.indexOf("/")!=-1)?e.type.indexOf("/"):e.type.length)] += e.debit - e.credit;
}

if (detailed) detailedSummary();
else briefSummary()

let sum = 0;
for (let key of Object.keys(total).sort()) {
    console.log(key + ": " + total[key]);
    sum += total[key];
    console.log("\t", sum);
}
