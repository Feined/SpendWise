# SpendWise — MVP Product Specification

**Version:** 1.1 (revised after India-first review)  
**Status:** Ready for a smaller implementation (spec only — no code in this document)  
**Audience:** A beginner building the app with AI-assisted coding (React, Vite, Tailwind CSS, JavaScript, `localStorage`). Recharts is **Phase 2**.  
**Primary user:** You, in India, using rupees. The same rules work for anyone who wants to save; only the default currency starts as INR.

This document is the source of truth. Version 1.0 used `max(plannedIncome, actualIncome)` and treated rent/bills as optional logged expenses. **Do not implement 1.0 formulas.**

---

## Review summary (why 1.1 exists)

### Problems found in v1.0

1. **Rent and other committed costs were missing from the plan.** Food/shopping math looked generous until rent, Wi-Fi, and subscriptions hit. In India those are usually known on day 1.
2. **`max(plannedIncome, actualIncome)` is unsafe.** It spends as if the *larger* number is already in hand (details in Section 13.2).
3. **Default currency was USD.** Wrong for the primary user.
4. **MVP was too large for a first React project:** custom/archive categories, income + expense CRUD, two charts, month-spanning edge cases, JSON import, and 25 storage recoveries. That is several apps, not one beginner MVP.
5. **Bills as a logging category plus no fixed-cost line invited double-counting** (rent in the plan *and* as a transaction).
6. **Income logs were allowed to silently change the daily limit.** That hides whether the user is using a guess or real pay.

### What stayed the same (purpose)

Help **you** (and later, others) **control food and goods spending** and **not run out of money before month-end**, after **fixed costs** and a **savings goal** are already reserved.

---

## 1. Product overview

**SpendWise** is a personal budgeting assistant that runs entirely in the browser. You tell it what you expect to earn, what you must pay (rent, utilities, subscriptions), and how much you want to save. The app then tells you how much is left for **variable spending** (especially food and shopping) and how much you can spend **today**.

**One-sentence pitch:** After rent and savings are set aside, SpendWise tells you how much you can still spend on food and goods today.

**How it works:**

1. Set up this month: estimated income, fixed expenses, savings goal.
2. Optionally record **actual income received** as one number on the plan (not a feed of paychecks in MVP).
3. Log **variable** expenses as they happen (Swiggy, groceries, Amazon, clothes, etc.).
4. See remaining variable budget and a daily spending limit.
5. Data stays on this device in `localStorage`.

**Design principles:**

- One person, one browser profile, one currency (default **₹ / INR**).
- Fixed costs and savings are reserved **before** food and shopping.
- Estimated income and actual income are **two different numbers**. The budget never uses `max()` of the two.
- Few screens. Numbers first. Charts later.

**Tech (MVP):** React, Vite, JavaScript, Tailwind CSS, `localStorage`.  
**Tech (Phase 2):** Recharts, JSON import, extra category tools.

---

## 2. User personas

### Primary — You (India)

- Earns in INR (salary, stipend, or freelance).
- Has predictable **fixed** costs: rent or family contribution, electricity, mobile/Wi-Fi, maybe OTT subscriptions.
- Variable leaks: food delivery, eating out, groceries, online shopping, clothes, gadgets.
- Goal: finish the month without borrowing from savings or asking for extra money.

**Needs:** rupee formatting, fixed costs on the plan, a daily cap for variable spend, Food and Shopping always visible.

### Secondary — Anyone who wants to save

Same product. They can change the currency symbol in Settings. No India-only features (UPI sync, GST, etc.) in MVP or Phase 2 unless specified later.

Personas Alex / Sam / Riley from v1.0 still apply as *behaviours* (food, shopping, savings), not as stored data.

---

## 3. Core user problems

| # | Problem | MVP response |
|---|---|---|
| 1 | Too much on food | Food category + Food total on dashboard + daily variable limit |
| 2 | Too much on goods/shopping | Shopping category + Shopping total + remaining variable budget |
| 3 | Not knowing where money goes | List of variable expenses this month, Food vs Shopping vs rest |
| 4 | Broke before month-end | Remaining after **fixed + savings**; daily limit on **variable** spend only |
| 5 | Missing savings target | Savings reserved in the plan, not “whatever is left” |

---

## 4. Revised MVP features

Build **only** these.

### 4.1 Monthly budget setup

For a calendar month (`YYYY-MM`):

- **Estimated income** (what you think you will earn).
- **Actual income received** (optional; `0` means “not recorded yet”).
- **Fixed monthly expenses** (list of committed items: e.g. Rent, Electricity, Wi-Fi, Subscriptions, Other).
- **Savings goal** (amount, not %).

First visit: no plan for the current month → Setup, not a fake dashboard.

### 4.2 Actual income (simple, on the plan)

Not a stream of income transactions in MVP.

On Setup (and editable later): one field **Actual income received this month**.

- `0` = you have not confirmed pay yet. Budget uses **estimated income**.
- `> 0` = you confirmed what arrived. Budget uses **actual income** (safer once pay is known).

Do **not** add a “salary gift of ₹500” as a separate transaction that replaces the whole month’s income. That was a v1.0 foot-gun.

### 4.3 Variable expense entry

Log only **discretionary / variable** spending: food, shopping, transport extras, entertainment, health, other.

Do **not** log rent here if rent is already a fixed line. Setup copy must say this.

### 4.4 Expense categories (starters only)

No custom categories and no archive in MVP.

| id | Display name | Use for |
|---|---|---|
| `food` | Food | Groceries, restaurants, delivery, chai, coffee |
| `shopping` | Shopping | Goods, clothes, Amazon, gadgets, household extras |
| `transport` | Transport | Metro, fuel, auto, ride-hail (not a car EMI — that is fixed) |
| `entertainment` | Entertainment | Movies, outings (OTT *subscription* belongs in fixed expenses) |
| `health` | Health | Pharmacy, personal care |
| `other` | Other | Variable spend that does not fit |

**No `bills` category in MVP** so rent/utilities are not logged twice.

### 4.5 Remaining budget

Dashboard shows, for the selected month:

- Estimated income vs actual income (and which one the budget is using)
- Total fixed expenses
- Savings goal
- Spendable (variable) budget
- Variable expenses so far
- Remaining to spend (variable)
- Food total and Shopping total (always, even if ₹0)

### 4.6 Monthly savings goal

Amount on the plan. Reserved before variable spending.

### 4.7 Daily spending limit

Current calendar month only. Applies to **variable** remaining money, not to rent.

### 4.8 Dashboard (numbers first)

- The figures in 4.5
- Daily limit + spent today + left today (current month)
- Variable expenses grouped by category (a **list**, not a chart)
- Last 5 variable expenses
- Banners: overspent / tight / income not confirmed / plan does not add up

**No Recharts in MVP.**

### 4.9 Local persistence

Save `AppData` in `localStorage` key `spendwise.v1`. Survive refresh.

Settings: change currency symbol/code (defaults INR), **export JSON**, **reset data**.  
**Import JSON is Phase 2.**

### 4.10 Month switch (minimal)

User can view/edit **current month** and create/open **one other month** (previous or next) via Setup month field + a simple previous/next on the dashboard. No month archive UI.

---

## 5. Features excluded from MVP (and Phase 2 vs later)

### Phase 2 (next, after you use the app for a real month)

See Section “Features moved to Phase 2” at the end of this document and the chat review. Summary: extra income entries, copy-plan-to-next-month, custom categories, Recharts, JSON import, category filters, richer month history.

### Later than Phase 2 (still out)

Login, backend, bank/UPI/SMS import, FX, shared budgets, debt, investments, push notifications, native apps, AI advice, receipt photos, per-category hard caps, auto-recurring transactions.

---

## 6. User stories (MVP only)

1. As a user in India, I want rupees as the default so amounts look like my real money.
2. As a new user, I want to set this month’s estimated income, fixed costs, and savings so the app knows what I cannot spend.
3. As a user, I want to record actual income when I get paid so the daily limit is based on money I have, not a guess.
4. As a user, I want to log a food or shopping expense quickly so I keep using the app.
5. As a user, I want remaining money to exclude rent and savings so I do not treat committed money as “free”.
6. As a user, I want a daily variable-spend limit so I do not go broke in the last week.
7. As a user, I want Food and Shopping totals so I can see my two main leaks.
8. As a user, I want data to survive a refresh.
9. As a user, I want a warning if my plan (fixed + savings) is larger than the income the app is using.

---

## 7. Functional requirements

| ID | Requirement |
|---|---|
| FR-S1 | Empty storage → Setup for current month. |
| FR-S2 | Setup collects: month, estimated income, actual income (may be 0), fixed expense lines, savings goal. |
| FR-S3 | At least one fixed-expense row is allowed to be ₹0; user can add/remove rows (max 10). Suggest default names: Rent, Utilities, Subscriptions, Other. |
| FR-S4 | Save plan → Dashboard. |
| FR-S5 | Edit plan later; numbers update. |
| FR-S6 | Warning if `incomeForBudget < totalFixed + savingsGoal` (non-blocking save). |
| FR-E1 | Add/edit/delete **variable** expenses: amount, date, category, label, optional note. |
| FR-E2 | Categories = the six starters only. |
| FR-K1 | Formulas in Section 13–14 exactly. |
| FR-K2 | Totals update after save without a full page reload. |
| FR-K3 | Daily limit only for real current month, and only if a plan exists. |
| FR-U1 | Dashboard lists (not charts) + Food/Shopping emphasis. |
| FR-U2 | Nav: Dashboard, Add expense, Transactions, Settings. Setup via “Edit plan”. |
| FR-U4 | Default display `₹` and `INR`. |
| FR-P1 | Persist `spendwise.v1`. |
| FR-P2 | Corrupt JSON → message + reset, no crash. |
| FR-P3 | Export JSON. |
| FR-P4 | Reset with one confirm (no typed RESET). |

---

## 8. Non-functional requirements

Unchanged in spirit from v1.0: local dates (not UTC), money to 2 decimals, no `NaN`, no network for data, Chrome/Edge/Firefox, usable on a phone browser, React state + load/save helpers (no Redux).

**NFR-India:** Format money with the rupee symbol prefix, e.g. `₹1,250.50` (grouping can be simple Western thousands in MVP; Indian numbering `₹1,20,000` is Phase 2).

**NFR-beginner:** Prefer `useState` + a `storage.js` and `budget.js` module over routers with nested layouts. React Router is optional; view state is enough.

---

## 9. Application pages

**Four routes** (was five). Income is not a separate page.

| Page | Route | Purpose |
|---|---|---|
| Setup / Month plan | `/setup` | Estimated income, actual income, fixed lines, savings |
| Dashboard | `/` | Remaining, daily limit, Food/Shopping, recent spend |
| Add / edit expense | `/add` | Variable expense only (`?id=` to edit) |
| Transactions | `/transactions` | This month’s variable expenses |
| Settings | `/settings` | Currency, export, reset |

---

## 10. User navigation flow

```
First open → Setup (income, fixed costs, savings)
  → Dashboard (daily variable limit)
  → Add expense (Food / Shopping / …)
  → Dashboard updates

When salary arrives → Edit plan → set Actual income received
  → If actual < estimate, spendable and daily limit shrink
  → If actual > estimate, spendable grows (you confirmed the money)

Overspend variable budget → banner, daily limit ₹0, logging still allowed
```

---

## 11. Data entities (updated)

Single key: `spendwise.v1` → `AppData`.

```
AppData
  version: 1
  settings: Settings
  monthPlans: MonthPlan[]
  transactions: Transaction[]   // variable expenses only in MVP
```

**No Category entity in MVP.** Category ids are the fixed starter list in code.

```
Settings (1)
MonthPlan (many, unique monthKey)
  → fixedExpenses: FixedExpenseLine[]
Transaction (many, type always "expense" in MVP)
```

Derived totals are **not** stored.

---

## 12. Data fields and types (updated)

Dates: `YYYY-MM-DD` (local). Month keys: `YYYY-MM`. Money: number, 2 decimals. Ids: string UUID.

### 12.1 `Settings`

| Field | Type | Default |
|---|---|---|
| `currencySymbol` | string | `"₹"` |
| `currencyCode` | string | `"INR"` |

### 12.2 `FixedExpenseLine`

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique within the plan |
| `name` | string | e.g. Rent, Electricity, Wi-Fi, Netflix, Other committed |
| `amount` | number | ≥ 0, 2 decimals |

### 12.3 `MonthPlan`

| Field | Type | Notes |
|---|---|---|
| `monthKey` | string | Unique `YYYY-MM` |
| `estimatedIncome` | number | ≥ 0. What you expect to earn. |
| `actualIncome` | number | ≥ 0. `0` = not recorded yet. |
| `fixedExpenses` | FixedExpenseLine[] | Committed costs. Max 10. |
| `savingsGoal` | number | ≥ 0 |
| `updatedAt` | string | ISO timestamp |

`plannedIncome` from v1.0 is **renamed** to `estimatedIncome`.

### 12.4 `Transaction` (MVP = variable expense only)

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique |
| `type` | `"expense"` | Always expense in MVP (field kept so Phase 2 can add `"income"`) |
| `amount` | number | > 0 |
| `date` | string | `YYYY-MM-DD` |
| `categoryId` | string | One of the six starter ids |
| `label` | string | Merchant, e.g. Swiggy, BigBasket, Amazon. Max 80 |
| `note` | string | Optional, max 200 |
| `createdAt` | string | ISO |
| `updatedAt` | string | ISO |

---

## 13. Budget calculation formulas (updated)

All for one `monthKey`. Variable expenses = transactions whose `date` falls in that month.

### 13.1 Building blocks

```
estimatedIncome = MonthPlan.estimatedIncome
actualIncome    = MonthPlan.actualIncome          // 0 means unknown

totalFixedExpenses = sum of MonthPlan.fixedExpenses[].amount
savingsGoal        = MonthPlan.savingsGoal

variableExpenses   = sum of transactions.amount in that month
foodTotal          = sum of expenses with categoryId === "food"
shoppingTotal      = sum of expenses with categoryId === "shopping"
```

### 13.2 Which income the budget uses (`incomeForBudget`)

**Rejected (v1.0):** `effectiveIncome = max(estimatedIncome, actualIncome)`

**Risks of `max(planned, actual)`:**

| Risk | What happens | Why it hurts the product goal |
|---|---|---|
| Pay is late or less than expected | The app keeps the **larger** (planned) number | You spend money that is not in the account and run out before month-end |
| You only received part of the month’s pay | `max` still uses the full estimate | Same cash shortfall |
| Freelance/bonus is uncertain | Estimate stays high until you remember to cut it | Daily limit is too generous |
| Windfall / extra overtime | `max` **raises** the limit automatically | Extra cash is spent on food/shopping instead of staying as extra savings |
| You log a small amount early | Combined with `max`, the plan still dominates | Feels “tracked” but the dangerous number is still the estimate |
| You forget to lower the estimate | Nothing in the formula protects you | The app fights the whole point of SpendWise |

**Safer MVP rule (distinguish estimate vs actual):**

```
if actualIncome === 0:
  incomeForBudget = estimatedIncome
  incomeSource    = "estimated"    // show: “Using estimate (pay not recorded)”
else:
  incomeForBudget = actualIncome
  incomeSource    = "actual"       // show: “Using actual income received”
```

**Why this is safer than `max`:**

- Before pay is recorded, you still get a daily limit (needed on day 1).
- After you record pay, the **real** amount wins, even if it is *lower* than the estimate.
- Extra income increases the budget **only if you type it into Actual income**, not because a log was `max`’d with a guess.
- A ₹500 gift cannot overwrite an ₹80,000 salary because actual income is **one confirmed total**, not “last transaction wins” and not a running sum mixed with the estimate.

**Dashboard must always show both** estimated and actual, plus a line: `Budget is using: estimate | actual`.

**If actual is 0 for many days:** show a reminder, not a silent assumption forever: “Pay not recorded. Daily limit is based on your estimate.”

### 13.3 Spendable budget and remaining (variable spend)

```
spendableBudget = incomeForBudget - totalFixedExpenses - savingsGoal
```

If `spendableBudget < 0`, **display the negative number** on Setup as a plan error, and treat spending room as:

```
spendableBudgetForLimit = max(0, spendableBudget)
remainingToSpend = spendableBudget - variableExpenses
```

`remainingToSpend` may be negative (variable spend ate into savings or into fixed-cost money).

**Meaning:** Fixed costs and savings are not “left to spend on Swiggy.”

### 13.4 Savings snapshot

```
moneyAfterFixedAndVariable = incomeForBudget - totalFixedExpenses - variableExpenses
savingsIfStopNow = max(0, moneyAfterFixedAndVariable)
savingsShortfall = max(0, savingsGoal - savingsIfStopNow)
```

If `remainingToSpend < 0`, savings (or worse, rent money) is at risk.

### 13.5 Status banners

| Condition | Status id |
|---|---|
| `spendableBudgetForLimit === 0` and `variableExpenses === 0` | `no-room` |
| `remainingToSpend < 0` | `overspent` |
| `remainingToSpend === 0` | `zero-left` |
| `remainingToSpend > 0` and `remainingToSpend <= 0.15 * spendableBudgetForLimit` and `spendableBudgetForLimit > 0` | `tight` |
| `actualIncome === 0` | also show `using-estimate` (can combine with others) |
| otherwise | `on-track` |

### 13.6 Category totals

Sum variable expenses by `categoryId`. Always show Food and Shopping.

### 13.7 Rounding

Store 2 decimals. Sum stored amounts, then display with 2 decimals.

---

## 14. Daily spending limit (variable only)

Only if `monthKey === currentMonthKey` and a plan exists.

```
daysRemainingIncludingToday = daysInMonth - dayOfMonth + 1

if remainingToSpend <= 0:
  dailyLimit = 0
else:
  dailyLimit = remainingToSpend / daysRemainingIncludingToday
```

Round **down** to 2 decimals.

```
spentToday = sum of variable expenses where date === local today
remainingToday = max(0, dailyLimit - spentToday)
```

Past/future months: hide daily limit.

Last day of month: `dailyLimit = remainingToSpend` if positive.

**Spent today includes Food and Shopping (and other variable), not rent.**

---

## 15. Edge cases (MVP)

| # | Case | Behaviour |
|---|---|---|
| E1 | First visit | Setup; no category seed table in storage |
| E2 | Plan, no variable spend | remaining = spendableBudget (may be 0) |
| E3 | `incomeForBudget < fixed + savings` | Warning; spendable negative; daily limit 0 |
| E4 | `actualIncome === 0` | Use estimate; banner `using-estimate` |
| E5 | Actual < estimate | Budget shrinks to actual |
| E6 | Actual > estimate | Budget uses actual (you confirmed it) |
| E7 | User logs rent as a variable expense anyway | Allowed (we cannot read their mind); Setup help text warns against it |
| E8 | Overspend variable | Negative remaining; still allow logs |
| E9 | Expense in another month | Counts only there |
| E10 | Corrupt storage | Reset option |
| E11 | Last day of month | Daily limit = remaining |
| E12 | Leap year | Correct `daysInMonth` |
| E13 | Storage full | Visible error |
| E14 | Two tabs | Last write wins |
| E15 | Reset | Confirm → Setup |

---

## 16. Validation rules

### Month plan

- `estimatedIncome`, `actualIncome`, `savingsGoal`: ≥ 0, ≤ 1e9, 2 decimals.
- Each fixed line: `name` 1–40 chars, `amount` ≥ 0, ≤ 1e9.
- Max 10 fixed lines.
- Warning if `incomeForBudget < totalFixed + savingsGoal`.

### Variable expense

- `amount` > 0, ≤ 1e9.
- `date` valid, within today−10 years … today+1 year.
- `categoryId` one of the six starters.
- `label` required, max 80.

---

## 17. Acceptance criteria (revised MVP)

### Monthly setup

- [ ] First visit opens Setup.
- [ ] Can save estimated income, actual income (0 allowed), 1–10 fixed lines, savings goal.
- [ ] Default currency on first run is ₹ / INR.
- [ ] Warning if fixed + savings > income used for budget.
- [ ] Dashboard shows total fixed expenses.

### Actual vs estimated income

- [ ] With actual = 0, budget uses estimated income and says so.
- [ ] With actual > 0, budget uses actual even if it is **less** than estimated (`max` is not used).
- [ ] Changing actual income updates remaining and daily limit.

### Variable expenses

- [ ] Add/edit/delete Food and Shopping (and other starters).
- [ ] Rent is not a required logged expense.
- [ ] Totals exclude fixed lines (fixed only from the plan).

### Remaining and daily limit

- [ ] `spendableBudget = incomeForBudget - totalFixed - savingsGoal`.
- [ ] `remainingToSpend = spendableBudget - variableExpenses`.
- [ ] Daily limit uses remaining variable money / days left including today.
- [ ] Hidden for non-current month.

### Dashboard and persistence

- [ ] Food and Shopping always listed.
- [ ] No chart library required.
- [ ] Refresh keeps data.
- [ ] Export works. Import is not in MVP.
- [ ] Reset returns to Setup.

---

## Appendix A — UI copy

- **You can spend this much today** — variable allowance, after rent and savings.
- **Left to spend this month** — variable remaining.
- **Fixed this month** — sum of committed lines.
- **Budget is using your estimate** / **Budget is using income you recorded**.
- Setup hint: **Do not log rent here. Put rent under fixed expenses.**

## Appendix B — Beginner build order

1. Vite + React + Tailwind  
2. `localStorage` load/save  
3. Setup: incomes, fixed lines, savings  
4. `budget.js` formulas + the Appendix C fixture  
5. Add expense + list  
6. Dashboard numbers + banners + daily limit  
7. Settings: INR default, export, reset  

## Appendix C — Test fixture (INR)

Month: September 2026 (30 days). Today: 15 Sep 2026 → 16 days remaining including today.

- estimatedIncome = 80,000  
- actualIncome = 80,000  
- fixed: Rent 20,000 + Wi-Fi 1,000 + Subscriptions 799 → **21,799**  
- savingsGoal = 10,000  
- variable expenses so far = 8,000 (of which Food 5,000, Shopping 2,000)

Then:

```
incomeForBudget   = 80,000          (actual > 0)
spendableBudget   = 80,000 - 21,799 - 10,000 = 48,201
remainingToSpend  = 48,201 - 8,000  = 40,201
dailyLimit        = 40,201 / 16     = 2,512.56   (round down)
```

If actualIncome were still `0`, the same spendable numbers would appear but the banner would say the budget is using the **estimate**.

If actualIncome = 70,000 (pay cut / less received):

```
spendableBudget  = 70,000 - 21,799 - 10,000 = 38,201
remainingToSpend = 30,201
```

v1.0 `max(80,000, 70,000)` would have **kept 80,000** and overstated the daily limit. That is exactly what we must not do.

If variable expenses = 50,000:

```
remainingToSpend = 48,201 - 50,000 = -1,799
dailyLimit = 0
status = overspent
```

---

## Features moved to Phase 2

Move these out of the first build. They are useful, not required to control food/shopping this month.

| Feature | Why it waited |
|---|---|
| Multiple income transactions | Easy to mix with estimated income; one Actual field is safer |
| Recharts (category pie, spend-per-day) | Extra library and empty-state bugs; a list is enough |
| Custom categories + archive | More state and validation; six starters cover food/goods |
| `bills` category | Collides with fixed expenses |
| JSON import | Easy to wipe a working budget; export is enough backup at first |
| Category filter on Transactions | Extra UI |
| Indian lakh/crore grouping | Nice; not required to spend less |
| Copy last month’s fixed costs to next month | Quality-of-life after you have used one real month |
| Rich month history / many months UX | Previous/next is enough |
| `firstDayOfWeek`, typed RESET, two-chart dashboard | Beginner noise |
| Auto-increase budget when actual > estimate without editing | Already handled by typing Actual; no `max()` |
| Per-category caps (Food ≤ X) | Powerful, easy to get wrong; Phase 2 after you know your averages |

---

*End of SpendWise specification v1.1.*
