#!/usr/bin/env python3

import pandas as pd
import pdfplumber

def _replace_newlines(text):
	if isinstance(text, str):
		text = text.replace('\n', ' ')
	
	return text

def _strip_strings(text):
	if isinstance(text, str):
		text = text.strip()
	
	return text

def sbi_convert_to_ir(filepath):
	file = pdfplumber.open(filepath)

	trx_cols = ["Txn Date", "Value Date", "Description",
			 "Ref No./Cheque No.", "Debit", "Credit", "Balance"]

	merged_df = pd.DataFrame(columns=trx_cols)

	for page in file.pages:
		for table in page.extract_tables():
			df = pd.DataFrame(table)
			df = df.map(_replace_newlines)
			df = df.map(_strip_strings)

			df.columns = df.iloc[0]
			df = df.iloc[1:]

			# Ensure the table has all columns we expect in a SBI statement
			if not all([trx in df.columns for trx in trx_cols]):
				continue

			merged_df = pd.concat([merged_df, df], axis=0,
						 ignore_index=True)

	# Fill NaN with empty strings to make it easy to assume strings
	merged_df = merged_df.fillna('')

	# Remove un-needed columns
	merged_df = merged_df.drop("Value Date", axis=1)

	# Rename other columns, as needed by IR
	merged_df = merged_df.rename(columns={
		"Txn Date": "date",
		"Description": "text",
		"Debit": "debit",
		"Credit": "credit",
		"Ref No./Cheque No.": "x-ref-number",
		"Balance": "x-balance"
	})

	# Merge Txn Date and Refernce Number, as Reference number field
	# contains useful information, such as "Sweep to" and "Sweep from"
	merged_df["text"] = merged_df["text"] + ". " + merged_df["x-ref-number"]

	# Convert numeric fields to float
	merged_df["debit"] = (merged_df["debit"].str
		.replace(',','')
		.replace('', '0')
		.astype(float))
	merged_df["credit"] = (merged_df["credit"].str
		.replace(',','')
		.replace('', '0')
		.astype(float))
	merged_df["x-balance"] = (merged_df["x-balance"].str
		.replace(',','')
		.replace('', '0')
		.astype(float))

	merged_df["x-src"] = "sbi"

	return merged_df

