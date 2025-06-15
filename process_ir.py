#!/usr/bin/env python3

import os
import sys
import json
import random
import re
import tempfile
import shutil
import pandas as pd

from ai_ask import ask_bam

# merchants table
merchants = {
	"WDL ATM CASH": "CashWithdrawal",

	"DEPOSIT TRANSFER INT": "Invest/Interest",
	"BULK POSTING ACHCr": "Invest/Dividend",

	"DEBIT SWEEP": "Invest/MOD",
	"TRANSFER CREDIT": "Invest/MOD",

	"TO TRANSFER UPI": "BankTransfers",

	"SPLITWISE": "Splitwise",
	"BY TRANSFER UPI": "Splitwise/Returned",	# Assuming all inward UPI transactions are splitwise clearing
	"BY TRANSFER NEFT": "Invest/Redeemed",		# Assuming all inward NEFT is redeemed mutual funds

	"ACH DEBIT RETURN CHARGES": "Penalty",
	"ACH C-": "Dividend_n_Interest",		# Maybe
	"INTEREST PAID": "Dividend_n_Interest",	# Maybe
	"BILLPAY DR-HDFC": "CreditCard",

	"PVR Elan": "Entertainment/Movie",
	"PVR INOX": "Entertainment/Movie",
	"Chitramandira": "Entertainment/Movie",

	"B SUMIYY/YESB": "Food/Fruits",
	"SADAM S": "Food/Fruits",
	"SASTA MA/HDFC": "Food/Fruits",
	"SIVANANT": "Food/Fruits",
	"PUSHPA SIVANANT": "Food/Fruits",
	"SRI GANE/PYTM": "Food/Juice",
	"SRI GANESH FRUIT JUI": "Food/Juice",
	"NANDINI-PAYTMQR": "Food/Milk",
	"UPI-NANDINI": "Food/Milk",
	"Dudh": "Food/Milk",
	"Milk": "Food/Milk",
	"CURD": "Food/DailyEssentials",
	"EGG": "Food/DailyEssentials",
	"Ande": "Food/DailyEssentials",
	"MITHAI": "Food/Outside",
	"Daalchini/PYTM": "Food/Riviera",
	"UPI-DRAGON HOUSE": "Food/Pyramid",
	"KRISHNA SAGAR": "Food/Outside",
	"Mr SAGAR/PYTM": "Food/Outside",
	"RAJU KUM/YESB": "Food/Outside",
	"SHRI KRISHNA": "Food/Outside",
	"OUTING": "Food/Outside",
	"LUNCH": "Food/Outside",
	"IDLI": "Food/Outside",
	"MOMOS": "Food/Outside",
	"THAR THE TASTE OF": "Food/Outside",
	"UPI-BANGALORE FOOD": "Food/Outside",
	"UPI-RESTAURANT BRANDS ": "Food/Outside",
	"ICECREAM": "Food/Outside",
	"UPI-CHULHA CHAUKI DA DHABA": "Food/Outside",
	"HungerBox": "Food/Riviera",
	"Eat Good Technologies": "Food/Riviera",
	"AMLA JUICE": "Food/Supplements",
	"MEDICINE": "Medical/Medicines",
	"TATA 1MG": "Medical/LabTests",
	"Zomato": "Food/Order",
	"Swiggy": "Food/Order",
	"Kanti Sweets": "Food/Sweets",
	"MITHAI": "Food/Sweets",
	"INDIA SWEET HOUSE": "Food/Sweets",
	"ADYAR ANANDA BHAVAN SWEET": "Food/Sweets",
	"Mujeeb A K": "Food/Kirana",

	"BECHU SAH/SBIN/9795": "Home",

	"for TDR": "Invest/FD",
	"ICIC/bsestarmfr": "Invest/MF",
	"ICCLGROWW-GROWW-BS": "Invest/Groww",
	"Nextbill/HDFC/groww.razo/Pay": "Invest/Groww",
	"Nextbill/ICIC/groww.razo/Pay": "Invest/Groww",
	"NEXTBILLION TECH": "Invest/Groww",
	"Indian Clearin": "Invest/Groww",
	"GROWW INVEST": "Invest/Groww",
	"RDInstallment": "Invest/RD",
	"RD INSTALLMENT": "Invest/RD",
	"WITHDRAWAL TRANSFER": "Invest/RD",
	"Insurance premium": "Insurance",
	"POLICY BAZAAR": "Insurance",

	"G GOPALA/PYTM/pay": "Grooming/Haircut",
	"SOAP": "Grooming/Things",

	"CAKE": "Misc",
	"TOP UP": "Misc",

	"IBM INDIA PRIVAT": "Salary",
	"ADITYA  GUPTA-AG": "Salary/SelfTransfer",

	"DECATHLO/HDFC/decathlon": "Shopping/Decathlon",
	"SHOE SHOP": "Shopping/Shoe",
	"Myntra Designs": "Shopping/Myntra",
	"DMART SRINI": "Shopping/DMART",
	"DmartIndia": "Shopping/DMART",
	"AVENUE SUPERMARTS": "Shopping/DMART",
	"UPI-G MART": "Shopping/Shops",
	"UPI-LIFE STYLE INTERNATI": "Shopping/Lifestyle",
	"Infiniti/ICIC/tata": "Shopping/Croma",
	"MORE RET/ICIC/MoreRetail": "Shopping/More",
	"RELIANCE/ICIC/jiomartgro/JIO20": "Shopping/JioMart",
	"TSF Food/PYTM": "Shopping/ISCON",
	"BLINKIT": "10MinDelivery/Blinkit",
	"Zepto": "10MinDelivery/Zepto",
	"Instamart": "10MinDelivery/Instamart",

	"FACTORY OUTLET": "Shopping/Shoes",

	"Google P": "Subscription/GoogleOne",
	"NETFLIX": "Subscription/Netflix",

	"Bangalor/INDB": "Travel/Metro",
	"BMTC BUS": "Travel/Bus",
	"BMTC20.rzp": "Travel/Bus",
	"IRCTC": "Travel/IRCTC",
	"Indian Railway Caterin": "Travel/IRCTC",
	"Rapido/UTIB/rapid": "Travel/Rapido",
	"Roppen20/PYTM/pay": "Travel/Rapido",
	"Roppen T": "Travel/Rapido",
	"RAPIDO": "Travel/Rapido",
	"UBER": "Travel/Cab",
	"CAB": "Travel/Cab",
	"AUTO": "Travel/Auto",

	"Gift Cards": "GiftCard",
	"Added Amazon Pay balance": "GiftCard",

	"Cashback received": "Cashback",
	"Swiggy Cashback": "Cashback/Swiggy",

	"Paid on Amazon": "Orders/Amazon",
	"Meesho": "Orders/Meesho",

	"JIOIN APP DIRECT": "Recharge/Mobile",
	"PZRECHARGE": "Recharge/Mobile",
	"Amazon Metro": "Recharge/Metro",	# Metro card recharge
}

# Assign 'type' label using AI. Will NOT overwrite 'type' labels if
# already tagged. Suggested to pass some entries with already labelled
# 'type', that helps the AI to create better type labels.
# 'untagged_records' is modified in-place.
async def assign_types_with_ai(untagged_records):
	# If the array is empty, no need to bother AI.
	if len(untagged_records) == 0:
		return

	# Only pass relevant fields to AI, doesn't need to pass everything.
	smaller_data = [
		{
			# Will use this id to assign types to the original array later.
			"id": idx,
			"message": record["text"],
			"debit": record.get("debit") or None,
			"credit": record.get("credit") or None
		}
		for idx, record in enumerate(untagged_records)
	]

	print("Asking AI to tag the data. Please wait...")

	response = await ask_bam(
		"Given these list of JSON objects having details of UPI transactions," +
		" categorise them into categories such as 'Food', 'Investment'," +
		" 'Entertainment', 'Travel', 'Shopping', or 'Misc' for small" +
		" transactions not fitting in other categories, and reply with" +
		" list of JSON objects, along with a 'type' key in each object." +
		" To do so, use context from the message in the upi transaction," +
		" such as 'idli'/'milk'/'eggs'/'ande' etc are food, groww is" + 
		" investment, pvr or movie tickets are entertainment, bus or metro or" +
		" royalbrothers or rapido is travel, etc." +
		" Print a list of JSON objects, along with 'type' key in each object." +
		" Don't print anything else than a list of JSON objects." +
		"\n" +
		json.dumps(smaller_data)
	)

	print(response)

	response_json = None

	if response:
		# Extract JSON objects from AI response.
		json_obj_pattern = re.compile(r'\{.*?\}', re.DOTALL)
		response_json = json_obj_pattern.findall(response)
		print(response_json)

	if not response_json or not isinstance(response_json, list):
		print("Failed to ask AI for categorising transactions.", file=sys.stderr)
		print("Ensure you have BAM_API_TOKEN in .env", file=sys.stderr)
	else:
		for record_str in response_json:
			try:
				record = json.loads(record_str)
				idx = record["id"]
				if untagged_records[idx]["type"] == "":
					untagged_records[idx]["type"] = record["type"]
			except Exception as e:
				print(f"Warning: Could not parse AI response record: {record_str}", file=sys.stderr)

def assign_types(df, use_ai) -> pd.DataFrame:
	# Ensure the dataframe has all columns mandated by IR
	if "date" not in df.columns:
		return None
	if "text" not in df.columns:
		return None
	if "debit" not in df.columns:
		return None
	if "credit" not in df.columns:
		return None

	# Sort the columns such that optional columns are at end
	mandatory_cols = ["date", "text", "debit", "credit"]
	optional_cols = [col for col in df.columns.tolist() if col not in mandatory_cols]
	df = df.reindex(columns=mandatory_cols + optional_cols)

	# Check if debit and credit only have numerical data
	if not pd.to_numeric(df['debit'], errors='coerce').notnull().all():
		exit(1)
	if not pd.to_numeric(df['credit'], errors='coerce').notnull().all():
		exit(1)

	# Filter out rows which don't have amount or date
	df = df[~(
		df['date'].str.strip().eq('')  |
	    ((df['debit'] == 0) & (df['credit'] == 0))
	)]

	# Create a 'type' column to store category, if not existing already
	if "type" not in df.columns:
		df["type"] = ""

	if "longterm" not in df.columns:
		df["longterm"] = False

	if "will_be_back" not in df.columns:
		df["will_be_back"] = 0

	# Sanitise the columns
	df.columns = (
		df.columns
			.str.strip()
			.str.lower()

			# replace spaces with underscores
			.str.replace(r'\s+', '_', regex=True)
	)

	# Lower-case version of merchants for case-insensitive matching
	updated_merchants = {key.lower(): value for key, value in merchants.items()}

	# Process each entry
	for idx, row in df.iterrows():
		df.loc[idx, "debit"]  = row["debit"] or 0.0
		df.loc[idx, "credit"] = row["credit"] or 0.0

		# Ensure we are using the updated row
		row = df.loc[idx]

		text   = row["text"]
		debit  = row["debit"]
		credit = row["credit"]
		type_  = row["type"] or ''

		# First try to match with merchants
		if not type_:
			text_lower = text.lower()
			for key, value in updated_merchants.items():
				if key in text_lower:
					type_ = value
					# TODO: this break causes behaviour to change, it
					# shouldn't happen that same transaction is chosing a
					# higher priority type at end
					# break

		# If type still not assigned, just ignore small values
		if not type_:
			if ((debit == 0 and credit <= 50) or (debit <= 50 and credit == 0)):
				type_ = "Misc"

		# Mark longterm
		if type_.startswith("Invest"):
			df.loc[idx, "longterm"] = True

		# Assign type
		df.loc[idx, "type"] = type_

	# AI tagging (optional)
	if use_ai:
		print("AI tagging has been disabled now. As BAM AI has been sunset.")

	return df

# Save updated data in file.
def save_data_in_file(df: pd.DataFrame):
	folder = tempfile.mkdtemp(prefix="temp-")

	json_filepath = os.path.join(folder, "data.json")
	with open(json_filepath, "w") as f:
		json.dump(
			df.to_dict(orient="records"),
			f,
			indent=4,
			ensure_ascii=False
		)
	print("Updated records saved to: ", json_filepath)

	# Create a link for simplicity.
	link_filepath = "temp-latest.json"
	try:
		if os.path.islink(link_filepath):
			# is_symlink also checks if the file exists.
			os.unlink(link_filepath)
	except FileNotFoundError:
		pass

	os.symlink(json_filepath, link_filepath)

# vi: noexpandtab:
