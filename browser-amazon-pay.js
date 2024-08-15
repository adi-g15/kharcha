/* Step 1: Go to https://www.amazon.in/pay/history?ref_=apay_deskhome_ViewStatement */
/* Step 2: Scroll down the page, till all transactions you want are available (by default only some latest transactions are fetched, but as you scroll down, older ones are fetched */

/* this is the element which represents all transactions */
transactions_div = document.getElementById("transactions-desktop")

/* expand all entries */
transactions_div.querySelectorAll("#itemDetailExpandedView .a-expander-header.a-declarative.a-expander-section-header.a-color-base-background.a-link-section-expander.a-size-medium").forEach(entry => entry.click())

/* list of all divs representing each transaction entry */
transactions = Array.from(transactions_div.querySelectorAll("#transaction-desktop"))

transactions.map(entry => {
	summary = entry.querySelector(".a-column.a-span9.a-text-left")
	details = entry.querySelector("div.a-expander-content.miniDetailsPage-desktop.a-expander-section-content.a-section-expander-inner.a-expander-content-expanded").querySelectorAll("div.a-row.pad-mini-details-text")

	return {
		"text": summary.querySelector(".pad-header-text").innerText,
		"time": summary.children[2].innerText,
		"amount": entry.querySelector(".a-row").querySelector(".a-column.a-span3.a-span-last").innerText,
		"note": details[0].innerText,
		"debit_or_credit": details[1].children[0].innerText,
		"mode": details[1].children[1].children[0].children[0].innerText
	};
})

