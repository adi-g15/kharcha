/* Step 1: Go to https://www.amazon.in/pay/history?ref_=apay_deskhome_ViewStatement */
/* Step 2: Scroll down the page, till all transactions you want are available (by default only some latest transactions are fetched, but as you scroll down, older ones are fetched */

/* TIP: Filter transactions to limit transactions to only Amazon Pay
 * Wallet (that's what I need):
 * https://www.amazon.in/pay/history?tab=ALL&filter={%22paymentInstruments%22:[{%22paymentInstrumentType%22:%22SVA%22,%22paymentInstrumentIds%22:null},{%22paymentInstrumentType%22:%22GC%22,%22paymentInstrumentIds%22:null}]} */

/* this is the element which represents all transactions */
transactions_div = document.getElementById("transactions-desktop")

/* expand all entries */
transactions_div.querySelectorAll("#itemDetailExpandedView .a-expander-header.a-declarative.a-expander-section-header.a-color-base-background.a-link-section-expander.a-size-medium").forEach(entry => entry.click())

/* list of all divs representing each transaction entry */
transactions = Array.from(transactions_div.querySelectorAll("#transaction-desktop"))

result_json = transactions.map(entry => {
	/* fill details available in summary */
	summary = entry.querySelector(".a-column.a-span9.a-text-left")

	transaction = {
		"text": summary.querySelector(".pad-header-text").innerText,
		"time": summary.children[2].innerText,
		"amount": entry.querySelector(".a-row").querySelector(".a-column.a-span3.a-span-last").innerText,
	}

	/* skip some transaction details */
	skip_details_titles = [
		"Cashback received",
		"Refunded on Amazon.in",
		"Refund from Amazon\nAmazon Pay Balance",
		"Added Money\nAmazon Pay Balance",
		"Added Amazon Pay balance"
	]
	for (skip_title of skip_details_titles) {
		if (transaction["text"].includes(skip_title)) {
			/* skip fetching details, as it's just a note, and uselesss for me */
			return transaction
		}
	}
	
	/* append details to transaction available after clicking the entry (we
	 * have already clicked in the beginning of the script) */
	details = Array.from(entry.querySelector("div.a-expander-content.miniDetailsPage-desktop.a-expander-section-content.a-section-expander-inner.a-expander-content-expanded").querySelectorAll("div.a-row.pad-mini-details-text"))

	details_idx = 0

	/* if details has more than 1 divs, the 1st div is a note, like "...
	 * has been put on hold for uber transaction", etc. */
	if (details.length > 1) {
		transaction = {
			"note": details[0].innertext,
			...transaction
		}

		/* since index 0 is the notes, so actual details is at index 1 */
		details_idx = 1
	}

	try {
	return {
		"mode": details[details_idx].children[1].children[0].children[0].innerText,
		...transaction
	};
	} catch {
		console.debug(entry)
		return {"ERROR": transaction}
	}
})

/* Personal preferences now */
result_json = result_json.filter(e => !e["text"].includes("On-hold")).filter(e => !e["text"].includes("Released"))
