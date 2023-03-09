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
let will_be_back = {};

function detailedSummary() {
    for (let e of data) if(!e.ignore && e.type != "comment") { total[e.type] = 0; will_be_back[e.type] = 0; }
    for (let e of data) if(!e.ignore && e.type != "comment") { total[e.type] += e.debit - e.credit; will_be_back[e.type] += (e.will_be_back || 0); }
}

function briefSummary() {
    for (let e of data) if(!e.ignore && e.type != "comment") {
	    const idx = e.type.indexOf("/")
	    const type = e.type.substr(0, (idx != -1) ? idx: e.type.length)
	    total[type] = 0;
	    will_be_back[type] = 0
    }
    for (let e of data) if(!e.ignore && e.type != "comment") {
	    const idx = e.type.indexOf("/")
	    const type = e.type.substr(0, (idx != -1) ? idx: e.type.length)
	    total[type] += e.debit - e.credit;
	    will_be_back[type] += (e.will_be_back || 0);
    }
}

if (detailed) detailedSummary();
else briefSummary()

let sum = 0;
for (let key of Object.keys(total).sort()) {
    if (will_be_back[key] > 0) {
	console.log(key + ": " + total[key] + "\t( -" + will_be_back[key] + " )");
    } else {
	console.log(key + ": " + total[key]);
    }

    sum += total[key] - will_be_back[key];
    console.log("\t", sum);
}
