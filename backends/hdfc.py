#!/usr/bin/env python3

import csv
import io
import pdfplumber
import pandas as pd

def hdfc_cc_pdf_convert_to_ir(filepath):
	file = pdfplumber.open(filepath)

	# TODO: Add a verification check to verify all transactions are
	# accounted for

	trx_cols = ['Date', 'Transaction Description', 'Feature Reward', 'Amount (in Rs.)']
	merged_df = pd.DataFrame(columns=trx_cols)

	for page in file.pages:
		for table in page.extract_tables():
			df = pd.DataFrame(table)
			df.columns = df.iloc[0]
			df = df.iloc[1:, :-1]

			# Ensure column names don't have whitespaces
			df.columns = df.columns.str.strip()

			# Ensure mandatory columns such as date/description and amount
			# exist in the table, else it's probably some other table
			# structure in the pdf
			if ("Date" not in df.columns):
				continue
			if ("Amount (in Rs.)" not in df.columns):
				continue
			if ("Transaction Description" not in df.columns):
				continue

			# Fill na/None with empty strings for further remove operations
			df = df.fillna('')

			# Remove rows containing no 'Date' or 'Amount'
			# Like, a row contains "ADITYA GUPTA" in transaction
			# description to denote which person's account the transaction
			# is for, remove such rows
			# If a table spans multiple page, it can also contains rows
			# with Feature point
			df = df[~(
			    df['Date'].str.strip().eq('') |
			    df['Amount (in Rs.)'].str.strip().eq('')
			)]

			# Remove bill payments
			df = df[~(
				df['Transaction Description'].str.contains("TELE TRANSFER CREDIT")
			)]

			merged_df = pd.concat([merged_df, df], axis=0,
						 ignore_index=True)

	# Columns like 'Feature Reward' can have NaN on concat
	merged_df = merged_df.fillna('')

	# Intermediate Representation (IR) requires 'date' and 'text' columns
	merged_df = merged_df.rename(columns={
		"Date": "date",
		"Transaction Description": "text",

		# Note: Points are currently in string format
		"Feature Reward": "x-points"
	})

	# Add keys required by IR
	merged_df["debit"] = 0.0
	merged_df["credit"] = 0.0

	for idx, row in merged_df.iterrows():
		amount = row["Amount (in Rs.)"]

		# Remove commas from amount
		amount = amount.replace(',', '')

		if "Cr" in amount:
			merged_df.loc[idx, "credit"] = float(amount.rstrip("Cr"))
		else:
			merged_df.loc[idx, "debit"] = float(amount)

	merged_df = merged_df.drop("Amount (in Rs.)", axis=1)

	return merged_df


# convert CSV credit card statement from HDFC mobile app
def hdfc_cc_convert_to_ir(content):
	start_idx = content.find("Transaction type~")
	end_idx = content.rfind("Opening Bal~")

	# actual CSV table starts from here
	content = content[start_idx:end_idx].strip()

	# parse CSV with delimiter `~`
	f = io.StringIO(content)
	reader = csv.DictReader(f, delimiter='~')

	# ignore only the first credit looking like bill payment
	first_bill_payment_ignored = False
	bill_payment_type = "FirstBillPayment"

	ir_records = []
	for record in reader:
		is_credit = record["Debit / Credit"] == "Cr"
		amount = float(record["AMT"].replace(',', ''))

		is_bill_payment = is_credit and (
			"NETBANKING TRANSFER" in record["Description"] or
			record["Description"].startswith("IMPS PMT ")
		)

		if is_bill_payment and first_bill_payment_ignored:
			bill_payment_type = "BillPayment"  # normal bill payments

		if is_bill_payment and not first_bill_payment_ignored:
			first_bill_payment_ignored = True

		rec = {
			"date": record["DATE"],
			"text": record["Description"],
			"debit": 0 if is_credit else amount,
			"credit": amount if is_credit else 0,
			# force 'type' to be different
			**({"type": bill_payment_type} if is_bill_payment else {}),
			# additional fields
			"reward_points": record["Feature Reward Points"],
		}

		ir_records.append(rec)

	return ir_records

def hdfc_convert_to_ir(content):
	# hdfc statement had an empty line in beginning, strip content
	content = content.strip()

	# Check whether it's a credit card statement
	if content.startswith("Name"):
		return hdfc_cc_convert_to_ir(content)

	f = io.StringIO(content)
	reader = csv.reader(f)

	# read all rows
	records = list(reader)

	# ignore 1st record, as it's headers
	records = records[1:]

	# IR -> Intermediate Representation, which is JSON in our case
	ir_records = []
	for record in records:
		ir_records.append({
			# type will be assigned by backend
			"date": record[0],
			"text": record[1],
			"debit": float(record[3]),
			"credit": float(record[4]),
			# additional fields
			"ref_number": record[5],
			"balance": float(record[6]),
		})

	return ir_records

