#!/usr/bin/env python3

from datetime import datetime as dt

# Define global variables
total_expense = {}
will_be_back = {}
longterm = {}
special_expense = {}

# Detailed Summary
def detailed_summary(data):
	global total_expense, will_be_back, longterm

	total_expense = {}
	will_be_back = {}
	longterm = {}

	for e in data:
		if not e.get("ignore") and e.get("type") != "comment":
			total_expense[e["type"]] = 0
			will_be_back[e["type"]] = 0
			longterm[e["type"]] = 0

	for e in data:
		if not e.get("ignore") and e.get("type") != "comment":
			total_expense[e["type"]] = round(total_expense[e["type"]] + e.get("debit", 0) - e.get("credit", 0), 2)
			will_be_back[e["type"]] += e.get("will_be_back", 0)
			if e.get("longterm"):
				longterm[e["type"]] += e.get("debit", 0) - e.get("credit", 0)

# @note It doesn't take into account any complex handling, such as
#       it does NOT take into account the fact that it is "ignore: true"
#       it does NOT take into account the fact that it is "type: comment"
#       it does NOT take into account the fact that it is "will_be_back"
#       it does NOT take into account the fact that it is "longterm"
#       it does NOT take into account the fact that it is "ignore: true"
#       it does NOT take into account the fact that it is "type: comment"
#
#       Do that yourself before passing the data array here
def get_brief_summary(data, field_name=None, reducer_fn=None):
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

def get_salary(data):
    return sum(e.get("credit", 0) for e in data if e.get("type") == "Salary")

def kharcha_analysis(data, is_detailed):
    if is_detailed:
        detailed_summary(data)
    else:
        global total_expense, special_expense, longterm, will_be_back
        total_expense = get_brief_summary([
            e for e in data if not e.get("ignore")
            and e.get("type") not in ["comment", "Salary", "Invest/Withdraw", "Lent/Repaid"]
            and not e.get("prev_leftover")
            and not e.get("special_expense")
        ])

        will_be_back = get_brief_summary(data, "will_be_back")

        longterm = get_brief_summary([e for e in data if e.get("longterm") is True])

        special_expense = get_brief_summary([e for e in data if e.get("special_expense") is True])

    salary = get_salary(data)

    leftover_summary = get_brief_summary(
        [e for e in data if e.get("prev_leftover") is True],
        None,
        lambda sum, e: round(sum + e.get("credit", 0) - e.get("debit", 0), 2)
    )
    prev_leftover = round(sum(leftover_summary.values()), 2)

    invest_withdraw_summary = get_brief_summary(
        [e for e in data if e.get("type") == "Invest/Withdraw"],
        None,
        lambda sum, e: round(sum + e.get("credit", 0) - e.get("debit", 0), 2)
    )
    invest_withdrawal = sum(invest_withdraw_summary.values())

    lent_repaid_summary = get_brief_summary(
        [e for e in data if e.get("type") == "Lent/Repaid"],
        None,
        lambda sum, e: round(sum + e.get("credit", 0) - e.get("debit", 0), 2)
    )
    lent_repaid = sum(lent_repaid_summary.values())

    total_out = round(
        sum(total_expense.values()) +
        sum(special_expense.values()) -
        sum(will_be_back.values()), 2
    )

    print("# " + dt.today().strftime("%d/%m/%Y"))
    print("=========================================")
    print("\n```")
    print(f"Salary: {salary}")
    print(f"Prev Month Leftover: {prev_leftover}")

    for k, v in leftover_summary.items():
        print(f"\t{k}: {v}")

    print("")
    print(f"Total In: {round(salary + prev_leftover + invest_withdrawal + lent_repaid, 2)}")
    print(f"Total Out: {total_out}")

    for k, v in special_expense.items():
        print(f"\t{k}: {v}")

    print("")
    print(f"Longterm expense: {round(sum(longterm.values()), 2)}")
    print("--------------------\n")

    # Sort and print total_expense breakdown
    total_expense_arr = sorted(total_expense.items(), key=lambda x: -x[1])
    sum_so_far = 0

    for key, value in total_expense_arr:
        if value == 0:
            continue

        if will_be_back.get(key, 0) > 0 or longterm.get(key, 0) > 0:
            print(f"{key}: {value}\t( ", end="")

            if will_be_back.get(key, 0) > 0:
                print(f"-{will_be_back[key]}", end="")

            if will_be_back.get(key, 0) > 0 and longterm.get(key, 0) > 0:
                print(" , ", end="")

            if longterm.get(key, 0) > 0:
                print(f"*{longterm[key] - will_be_back.get(key, 0)}", end="")

            print(" )")
        else:
            print(f"{key}: {value}")

        sum_so_far = round(sum_so_far + value - will_be_back.get(key, 0), 2)
        print("\t", sum_so_far)

    print("```")

