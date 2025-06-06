#!/usr/bin/env python3

import csv
import io

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

