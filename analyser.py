#!/usr/bin/env python3

from datetime import datetime as dt
import pandas as pd

# @note It doesn't take into account any complex handling, such as
#	   it does NOT take into account the fact that it is "will_be_back"
#
#	   Do that yourself before passing the data array here
def get_summary(data, field_name=None, reducer_fn=None):
	obj = {}

	if reducer_fn is None:
		if field_name is None:
			reducer_fn = lambda sum, e: round(sum + e.get("debit", 0) - e.get("credit", 0), 2)
		else:
			reducer_fn = lambda sum, e: round(sum + e.get(field_name, 0) or 0, 2)

	for e in data:
		# replicate JS logic: type is everything before '/'
		typ = e.get("type", "")
		idx = typ.find("/")
		typ = typ if idx == -1 else typ[:idx]

		# if empty type, allow ':' to appear just like JS for now
		key = typ if typ != "" else "<Unknown>"

		obj[key] = reducer_fn(obj.get(key, 0), e)

	return obj

def get_kharcha_in_type(series, type_):
	filtered_idxs = series.keys().str.startswith(type_)
	return series[filtered_idxs].sum()

def kharcha_analysis(df, is_detailed):
	print(df[df["type"].str.fullmatch('')])

	if not is_detailed:
		# If user doesn't want detailed summary we don't need detailed
		# types
		#
		# Create a copy to ensure we don't modify original DataFrame
		df = df.copy()
		df["type"] = df["type"].str.split('/').str.get(0)

	summary = pd.Series(dtype='float')
	for _, row in df.iterrows():
		type_ = row["type"] if row["type"] != "" else "<Unknown>"
		val   = row["debit"] - row["credit"] - row["will_be_back"]

		summary[type_] = summary.get(type_, 0) + val

	investments = get_kharcha_in_type(summary, "invest")
	salary		= get_kharcha_in_type(summary, "salary")

	summary.to_json(path_or_buf="/tmp/json")
	total_out = round(summary.sum() - investments - salary, 2)

	print("# " + dt.today().strftime("%d/%m/%Y"))
	print("=========================================")
	print("\n```")
	if salary > 0:
		print(f"Salary: {salary}")
	if investments > 0:
		print(f"Investments: {investments}")
	print(f"Expenses: {total_out}")
	print("--------------------\n")

	# Sort the total expenses based on descending order
	# Take the 0th row, sort it, then reindex summary based on that index
	summary = summary.sort_values(ascending=False)
	sum_so_far = 0

	# Filter our investments and salary, as treating them separate
	expenses = summary[~(summary.keys().str.startswith("salary") |
					  summary.keys().str.startswith("invest"))]

	print(expenses.to_string(dtype=False))
	#for type_, value in expenses.items():
	#	print(f"{type_}\t: {value}")
	#	sum_so_far = round(sum_so_far + value, 2)
	#	print("\t\t\t", sum_so_far)

	print("```")

# vi: set noexpandtab:
