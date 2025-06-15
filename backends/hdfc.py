#!/usr/bin/env python3

import csv
import io
import pdfplumber
import pandas as pd
from pathlib import Path

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

			# XXX: If checking with all statements, i guess we shouldn't skip any
			# transaction, even bill payment
			# # Remove bill payments
			# df = df[~(
			# 	df['Transaction Description'].str.contains("TELE TRANSFER CREDIT") |
			# 	df['Transaction Description'].str.contains("CC PAYMENT")
			# )]

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

	# Remove rows containing no 'Date' or 'Amount'
	# Like, a row contains "ADITYA GUPTA" in transaction
	# description to denote which person's account the transaction
	# is for, remove such rows
	# If a table spans multiple page, it can also contains rows
	# with Feature point
	merged_df = merged_df[~(
	    merged_df['date'].str.strip().eq('') |
	    merged_df['Amount (in Rs.)'].str.strip().eq('')
	)]

	# Add keys required by IR
	merged_df["debit"] = 0.0
	merged_df["credit"] = 0.0

	for idx, row in merged_df.iterrows():
		text   = row["text"]
		amount = row["Amount (in Rs.)"]

		# Remove commas from amount
		amount = amount.replace(',', '')

		if "Cr" in amount:
			merged_df.loc[idx, "credit"] = float(amount.rstrip("Cr"))
		else:
			merged_df.loc[idx, "debit"] = float(amount)

		# In context of credit card, a NETBANKING transfer is almost always
		# a Bill Payment
		if "NETBANKING TRANSFER" in text:
			merged_df.loc[idx, "type"] = "Bill/CreditCard"

	merged_df = merged_df.drop("Amount (in Rs.)", axis=1)

	merged_df["x-src"] = "hdfc-cc"

	return merged_df

# convert CSV credit card statement from HDFC mobile app
def hdfc_cc_csv_convert_to_ir(content):
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

# HDFC 'delimited' statement format is not really CSV
# Because it doesn't quote text containing ','
# Such as, if a cell has comma in-between, a valid CSV generally quotes the
# text
#
# Such as the following transaction description:
# NEFT DR-XXXXXXXXXXX-NNNNNN NNNN-NETBANK, MUM-NXXXXXXXXXXXXXXX-TRANSFERRING TO ME
#
# Above description is not quoted by HDFC website, and thus when read by a
# CSV reader, or by pandas, it will get treated as 2 cells, even though it
# should only be 1 cell
#
# Actually the pattern in HDFC's "delimited" format is actually that the
# cell width match corresponding header field length
#
# HDFC's "delimited" format is shitter, the above pattern is not followed
# for few fields, such as "Debit Amount", thus you are back to using ',' to
# parse those fields.
#
# So, I use above length based pattern for first few cells, till we are
# done with the "Narration" header, then fallback to split based on ','
def hdfc_convert_to_ir(filepath) -> pd.DataFrame:
	# hdfc statement had an empty line in beginning, strip content
	content = Path(filepath).read_text()

	# Check whether it's a credit card statement
	if content.strip().startswith("Name"):
		return hdfc_cc_csv_convert_to_ir(content)

	lines = content.split('\n')

	# filter empty lines
	lines = [l for l in lines if l.strip() != '']

	header = lines[0].split(',')

	# ignore 1st line, as it's headers
	lines = lines[1:]

	records = []
	for line in lines:
		entries = []
		for hdr in header:
			length = len(hdr)
			entries.append(line[:length].strip())

			# ignore first length+1 elements (cell length + comma)
			line = line[length+1:]

			if hdr.strip() == "Narration":
				# we are done with 'Narration' text, now we can fallback to
				# usual .split(',') for rest of the columns
				break

		# push rest of the cells
		entries.extend([s.strip() for s in line.split(',')])
		records.append(entries)

	# Trim the header
	header = [h.strip() for h in header]
	df = pd.DataFrame(records, columns=header)

	# Get the columns in IR format
	df = df.rename(columns={
		"Date": "date",
		"Narration": "text",
		"Debit Amount": "debit",
		"Credit Amount": "credit",
		"Chq/Ref Number": "x-ref-number",
		"Closing Balance": "x-balance"
	})

	# Drop unnecessary columns
	df = df.drop("Value Dat", axis=1)

	# Auto assign types, mostly it will assign all dtypes as string
	df = df.convert_dtypes()

	df["debit"]  = df["debit"].apply(lambda x: float(x))
	df["credit"] = df["credit"].apply(lambda x: float(x))

	df["x-src"] = "hdfc"

	return df

