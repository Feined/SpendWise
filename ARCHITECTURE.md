# SpendWise — Architecture (MVP v1.1)

**Status:** Design only. Do not treat this file as application source.  
**Follows:** `PRODUCT_SPEC.md` v1.1  
**Stack:** React, Vite, JavaScript, Tailwind CSS, `localStorage`  
**Not in MVP:** Redux, backend, auth, banks/UPI, Recharts, service worker, install prompts

This document describes **how to structure** a mobile-first responsive web app. Implementation comes in a later step.

---

## Goals

- Works first on a **portrait phone** (~360–430px wide), then tablet, then desktop.
- Logging a food/shopping expense takes **few taps** with large controls.
- Dashboard is a **vertical stack of cards**, not a wide table.
- One source of truth: `AppData` in memory, mirrored to `localStorage` key `spendwise.v1`.
- Budget math lives in **one module** (`budget.js`) so the UI cannot invent remaining balance.
- Folder layout stays **shallow** so a beginner can find files.

**Breakpoint (Tailwind, mobile-first):**

| Name | Width | Layout |
|---|---|---|
| default | `< 768px` | Bottom navigation + stacked cards |
| `md` | `≥ 768px` | Sidebar (or top nav) + slightly wider content column |
| `lg` | `≥ 1024px` | Same chrome as `md`, content `max-w-3xl` centered in the main pane |

Do **not** add extra breakpoints unless a real layout breaks. One switch at `md` is enough.

---

## 1. Folder structure

```
SpendWise/
  PRODUCT_SPEC.md
  ARCHITECTURE.md
  index.html
  vite.config.js
  package.json
  tailwind.config.js          # content: ./index.html, ./src/**/*.{js,jsx}
  postcss.config.js
  public/
    favicon.svg               # also used later as PWA icon source
    icons/                    # placeholders for 192 and 512 (add files later)
      icon-192.png            # Phase: PWA — not required to function in MVP
      icon-512.png
    manifest.webmanifest      # drafted, not wired in MVP (see § PWA)
  src/
    main.jsx                  # React mount, CSS import
    App.jsx                   # Router + SpendWiseProvider
    index.css                 # Tailwind directives + a few globals
    constants/
      categories.js           # six starter ids + labels
      storage.js              # STORAGE_KEY = "spendwise.v1"
    data/
      defaultAppData.js       # empty AppData factory (INR defaults)
    lib/
      dates.js                # local YYYY-MM, YYYY-MM-DD, days in month
      money.js                # round 2dp, parse input, format ₹
      ids.js                  # uuid helper
      budget.js               # spec §13–14 — no React
      validation.js           # spec §16 — no React
      storage.js              # load / save / export / reset
    context/
      SpendWiseContext.jsx    # appData + selectedMonthKey + actions
    components/
      layout/
        AppShell.jsx          # chooses mobile vs desktop chrome
        MobileBottomNav.jsx
        DesktopSidebar.jsx
        PageHeader.jsx
        Screen.jsx            # padded main column, overflow-x-hidden
      ui/
        Button.jsx
        IconButton.jsx
        TextField.jsx         # 16px font, min-height 48px
        MoneyField.jsx
        SelectField.jsx
        Banner.jsx
        Card.jsx
        EmptyState.jsx
        ConfirmDialog.jsx
      dashboard/
        DailyLimitCard.jsx
        RemainingCard.jsx
        IncomeSourceLine.jsx
        FoodShoppingRow.jsx
        CategoryList.jsx
        RecentExpenses.jsx
        MonthSwitcher.jsx
      expenses/
        ExpenseForm.jsx
        ExpenseCard.jsx
        CategoryChips.jsx     # large tap targets, not a tiny <select> only
      plan/
        SetupForm.jsx
        FixedExpenseEditor.jsx
    pages/
      SetupPage.jsx
      DashboardPage.jsx
      AddExpensePage.jsx
      TransactionsPage.jsx
      SettingsPage.jsx
      CorruptStoragePage.jsx  # only if load() fails
```

**Rules for beginners:**

- `lib/` has **no** React imports.
- `pages/` compose components; they do not call `localStorage` directly.
- One file ≈ one job. Avoid `utils.js` dumping grounds.
- Do not create `hooks/`, `services/`, `store/` folders until you need them. If `SpendWiseContext` grows, extract `useSpendWise()` in the same context file.

**Routing recommendation:** use **React Router** (`react-router-dom`). Spec says it is optional; for a PWA-ready URL per screen and a bottom nav with `NavLink`, Router is the simpler long-term choice. Alternative (no Router): `view` string in context (`"dashboard" | "add" | ...`). Pick Router and stick to it.

| Path | Page | In bottom/sidebar nav? |
|---|---|---|
| `/setup` | Setup | No (entry + “Edit plan”) |
| `/` | Dashboard | Yes |
| `/add` | Add expense | Yes (primary) |
| `/add?id=` | Edit expense | No (opened from a card) |
| `/transactions` | Transactions | Yes |
| `/settings` | Settings | Yes |

If there is no plan for `selectedMonthKey`, **redirect to `/setup`** (except when already on Setup).

---

## 2. Component structure

```
App
  SpendWiseProvider
    BrowserRouter
      AppShell
        DesktopSidebar        (hidden below md)
        Screen
          <Routes>
            SetupPage
            DashboardPage
            AddExpensePage
            TransactionsPage
            SettingsPage
            CorruptStoragePage
        MobileBottomNav       (hidden from md up; hidden on Setup if you want more form space)
```

### Page → child map

| Page | Main children |
|---|---|
| SetupPage | PageHeader, SetupForm → MoneyFields, FixedExpenseEditor, Banners, Button Save |
| DashboardPage | MonthSwitcher, Banners, DailyLimitCard, RemainingCard, IncomeSourceLine, FoodShoppingRow, CategoryList, RecentExpenses, text link “Edit plan” |
| AddExpensePage | ExpenseForm (amount first, then category chips, label, date, note) |
| TransactionsPage | list of ExpenseCard (amount, category, label, date; swipe not required — Edit / Delete buttons) |
| SettingsPage | currency fields, Export button, Reset + ConfirmDialog, “Edit this month’s plan” |

### Shared UI contract (conceptual)

- **Button:** `variant`: `primary` | `secondary` | `danger`. Min height **48px**. Full width on mobile for primary actions (`w-full md:w-auto`).
- **TextField / MoneyField:** `text-base` (16px) so iOS Safari does not zoom. `min-h-12`. Label **above** the input (never placeholder-only).
- **Card:** `rounded-xl`, padding `p-4`, `w-full`, no horizontal overflow.
- **Banner:** one message, full width, used for `overspent`, `tight`, `using-estimate`, `no-room`.

**Do not** build a design system folder with 30 variants. Five UI primitives are enough.

---

## 3. Responsive layout strategy

### Global

```
html, body: overflow-x: hidden; max-width: 100%;
```

- All pages: `flex flex-col`, content `px-4 pb-24 md:pb-8` (bottom padding clears the mobile nav).
- Prefer `flex-col gap-4` stacks. From `md`, dashboard may use a **two-column grid only for secondary cards** (e.g. Food | Shopping side by side). **Daily limit stays full width** on all sizes (the number people look at first).
- Never use HTML `<table>` for expenses. Use **cards**.
- Images/icons: `max-w-full`. Long merchant names: `break-words`.
- Viewport: `width=device-width, initial-scale=1` in `index.html`. Add `viewport-fit=cover` later for notches (PWA).

### Mobile (default CSS)

- One column.
- Sticky top: thin **PageHeader** (app name + month).
- Sticky bottom: **MobileBottomNav** (~64px + safe-area).
- Dashboard order (top → bottom): banners → **daily limit** → remaining this month → income source line → Food & Shopping → other categories → recent 5 → edit plan.

### Tablet (`md`)

- Sidebar ~220px + main.
- Same card stack; Food/Shopping can sit in two columns.
- Hide bottom nav.

### Desktop (`lg`)

- Same as tablet. Main column `max-w-3xl` so lines of rupees do not stretch across a 27" monitor.
- No extra widgets. No charts.

### Touch

| Control | Minimum |
|---|---|
| Nav items, buttons, chips, delete | 44×44px, prefer 48px |
| Form inputs | 48px height |
| Space between stacked buttons | `gap-3` (12px) or more |

Category picker on Add Expense: **wrap chips** (`flex flex-wrap gap-2`), each chip `px-4 py-3`. Food and Shopping first.

### Add Expense speed (mobile)

1. Open `/add` in **one tap** from the center/emphasized nav item.
2. Focus **amount** first (`inputMode="decimal"`).
3. Category chips (no extra screen).
4. Label (merchant).
5. Date defaults to **today**; leave at the bottom.
6. Note collapsed or last.
7. Save is a full-width primary button **above** the bottom nav (form `pb` so it is not covered). After save → Dashboard.

Optional later (not MVP): dashboard floating action button. **MVP: emphasized Add in the nav is enough** if it is visually primary.

---

## 4. Mobile navigation design

**Four destinations**, equal row, safe-area inset:

| Slot | Label | Route | Visual |
|---|---|---|---|
| 1 | Home | `/` | house icon + label |
| 2 | Add | `/add` | **larger / filled** plus icon (primary color) |
| 3 | List | `/transactions` | list icon |
| 4 | Settings | `/settings` | gear icon |

- Use `NavLink` active styles (text + icon weight).
- Labels **always visible** (do not icon-only; easier for a first-time user).
- **Setup is not in the bar.** Reaching it: first-run redirect, Dashboard “Edit plan”, Settings “Edit month plan”.
- On **Add** and **Setup**, keep the bar (user can cancel by tapping Home) **or** hide it on Setup only to gain keyboard space. Recommendation: **hide bottom nav on `/setup`** so the keyboard + Save are usable; show a header “Cancel” back to dashboard if a plan already exists.
- `position: fixed; bottom: 0; left: 0; right: 0; z-index: 40;` with `padding-bottom: env(safe-area-inset-bottom)`.
- Do not put five items in the bar. Four is the maximum for thumbs.

```
[  Home  ] [  ADD  ] [  List  ] [  Settings  ]
              ^
        visually stronger
```

---

## 5. Desktop navigation design

**Left sidebar** from `md` upward (`hidden md:flex`).

```
+------------------+---------------------------+
| SpendWise        |  Page header + month      |
|                  |                           |
|  Dashboard       |  Main (max-w-3xl)         |
|  Add expense     |                           |
|  Transactions    |                           |
|  Settings        |                           |
|                  |                           |
|  Edit plan (text)|                           |
+------------------+---------------------------+
```

- Sidebar width: `w-56`, border-right, not a hamburger menu in MVP (hamburger is extra state).
- Active item: background tint + font-medium.
- **Add expense** uses the same primary color as mobile Add.
- Month switcher lives in the **main header**, not the sidebar (it is about data, not app sections).
- Top-nav alternative (if sidebar feels heavy): a single `md:flex` row under the header. **Prefer sidebar** so the main column stays the same width as on tablet.

---

## 6. State structure

**No Redux. No extra store library.**

Two layers:

1. **Persisted:** `appData` (`AppData`).
2. **Session UI:** not written to `localStorage` except as noted.

```
SpendWiseContext value
  appData                 // AppData | null while booting
  loadError               // null | "corrupt" | "quota"
  selectedMonthKey        // "YYYY-MM"
  isReady                 // boolean

  actions
    setSelectedMonthKey
    saveMonthPlan(plan)
    addExpense(fields)
    updateExpense(id, fields)
    deleteExpense(id)
    updateSettings(partial)
    exportJson()          // download; does not change state
    resetAll()            // confirm already done in UI
```

**Derived data** (never stored): call `getMonthSnapshot(appData, selectedMonthKey, todayLocal)` from `budget.js` inside pages. Do not put snapshot in context unless profiling shows pain (it will not).

**selectedMonthKey:** keep in React state. On first load, set to **today’s month**. Do not persist it in v1 so a new calendar month opens the current month (then Setup if no plan). Optional later: persist last viewed month.

**Forms:** local `useState` in SetupForm / ExpenseForm. Write to context only on valid Save.

**Boot sequence:** `useEffect` once → `loadAppData()` → set `appData` or `loadError`.

---

## 7. AppData structure

Matches spec v1.1. Shape for implementers:

```
AppData = {
  version: 1,
  settings: {
    currencySymbol: "₹",
    currencyCode: "INR"
  },
  monthPlans: [
    {
      monthKey: "2026-09",
      estimatedIncome: 80000,
      actualIncome: 0,
      fixedExpenses: [
        { id: "...", name: "Rent", amount: 20000 },
        { id: "...", name: "Utilities", amount: 0 },
        { id: "...", name: "Subscriptions", amount: 0 },
        { id: "...", name: "Other", amount: 0 }
      ],
      savingsGoal: 10000,
      updatedAt: "2026-09-15T12:00:00.000Z"
    }
  ],
  transactions: [
    {
      id: "...",
      type: "expense",
      amount: 249.00,
      date: "2026-09-15",
      categoryId: "food",
      label: "Swiggy",
      note: "",
      createdAt: "...",
      updatedAt: "..."
    }
  ]
}
```

- `version` must be `1`. Unknown versions → treat as corrupt (or Phase 2 migrate).
- Categories are **not** in `AppData`; they live in `constants/categories.js`.
- New month plan: copy the **empty default fixed-line names**, amounts `0`, do not auto-copy last month (that is Phase 2).

---

## 8. localStorage flow

```
App boot
  read localStorage["spendwise.v1"]
    missing → defaultAppData() → setState (do not write until first successful save, or write empty shell — pick: write on first Setup save only)
    present → JSON.parse
      throw / not an object / version !== 1 → loadError = "corrupt" → CorruptStoragePage (Reset)
      ok → set appData

Any successful mutation
  next = { ...appData, ...changes }
  try setItem(JSON.stringify(next))
    ok → setState(next)
    QuotaExceededError → keep old state, show banner "Storage full"

Export
  stringify current appData
  download spendwise-backup-YYYY-MM-DD.json

Reset
  removeItem("spendwise.v1")
  appData = defaultAppData()
  selectedMonthKey = current month
  navigate /setup
```

**Do not** debounce saves in MVP. Each expense save is one `setItem`.  
**Do not** sync across tabs (last write wins; acceptable).  
**Do not** implement import in MVP.

`storage.js` public functions (names only):

- `loadAppData()`
- `saveAppData(appData)`
- `clearAppData()`
- `buildExportBlob(appData)`

Pages never touch `window.localStorage`.

---

## 9. Budget calculation module

File: `src/lib/budget.js`  
Input: `appData`, `monthKey`, `today` (`YYYY-MM-DD` local).  
Output: a **snapshot** object for the UI. No DOM, no `localStorage`.

**Must implement spec §13–14 exactly:**

- `incomeForBudget`: if `actualIncome === 0` then estimated, else actual. **Never `max()`.**
- `totalFixedExpenses`, `spendableBudget`, `spendableBudgetForLimit`, `remainingToSpend`
- `variableExpenses`, `foodTotal`, `shoppingTotal`, `totalsByCategory[]`
- `incomeSource`: `"estimated" | "actual"`
- Daily fields **only** if `monthKey === currentMonth(today)` **and** a plan exists: `dailyLimit` (round **down** 2dp), `spentToday`, `remainingToday`, `daysRemainingIncludingToday`
- Else daily fields `null`
- `statusId` from spec §13.5 (`no-room`, `overspent`, `zero-left`, `tight`, `on-track`) plus flag `usingEstimate`

If no `MonthPlan` for `monthKey`: return `{ hasPlan: false }` and let the router send the user to Setup. Do not fake zeros as a plan.

**Helper-only functions in the same file** (keep them small and named like the spec):

- `getPlan(appData, monthKey)`
- `sumVariableExpenses(transactions, monthKey)`
- `getMonthSnapshot(...)`  ← the one pages call

`dates.js` owns `getLocalToday()`, `getMonthKey(date)`, `daysInMonth(monthKey)`, `shiftMonth(monthKey, -1 | +1)`, `isDateInMonth(date, monthKey)`.

`money.js` owns `roundMoney`, `parseMoneyInput`, `formatMoney(amount, symbol)`.

Unit-test later by running Appendix C numbers from the spec by hand (or a tiny `budget.test.js` if you add Vitest — optional).

---

## 10. Validation module

File: `src/lib/validation.js`  
Returns `{ ok: true, value }` or `{ ok: false, errors: { fieldName: message } }`. Pages map `errors` onto fields.

**`validateMonthPlan(input)`**

- `monthKey` format `YYYY-MM`
- `estimatedIncome`, `actualIncome`, `savingsGoal` ≥ 0, ≤ 1e9, 2 decimals
- `fixedExpenses` length 1–10; each name 1–40 chars; amount ≥ 0
- `warnings[]` (non-blocking): plan does not add up when `incomeForBudget < totalFixed + savings`

**`validateExpense(input)`**

- amount > 0, ≤ 1e9
- date valid, in allowed range
- `categoryId` in starter list
- label trimmed length 1–80
- note ≤ 200
- `type` forced to `"expense"`

Do not validate inside JSX with scattered `if`s. Call these functions on submit (and optionally on blur).

---

## 11. Month-switching approach

**Minimal (spec 4.10):** previous / next only. No calendar grid, no year picker.

- `MonthSwitcher` shows a title like `September 2026` and two icon buttons: prev, next.
- `selectedMonthKey` updates in context.
- If the new month **has a plan** → Dashboard snapshot for that month (daily limit hidden if it is not *today’s* month).
- If the new month **has no plan** → navigate to `/setup` with that `monthKey` pre-filled (still `selectedMonthKey`).
- Next-month from December increments the year (`dates.shiftMonth`).
- Expenses on Transactions and Dashboard filter by `selectedMonthKey` via `date` prefix `YYYY-MM`.
- Switching month does **not** change stored transactions; it only changes which slice you view.

**Current vs selected:**

- “Today” and daily limit always use the **device local calendar**, not `selectedMonthKey`, except the limit is shown only when they match.

---

## 12. Error-handling approach

| Situation | UX |
|---|---|
| Corrupt JSON / bad version | Dedicated screen: explain + Reset. Do not mount the dashboard. |
| `QuotaExceededError` | Banner on current page; last good `appData` remains. |
| Validation errors | Inline under the field; do not save. |
| Plan math warning | Banner on Setup; save still allowed (spec). |
| No plan for selected month | Redirect Setup, not empty “₹NaN”. |
| `getMonthSnapshot` missing plan | `hasPlan: false` — UI must check this. |
| Delete expense | ConfirmDialog, then save. |
| Reset all data | ConfirmDialog, then clear. |
| Export failure (rare) | Banner “Could not download file.” |
| Two tabs | Ignore; last `setItem` wins. |
| Invalid `?id=` on `/add` | Banner + empty form (treat as add). |

**Never** show `NaN`, `undefined`, or raw exceptions in the UI. Wrap `load`/`save` in try/catch in `storage.js` only.

**No error tracking SaaS.** Console logging is enough for a personal MVP.

---

## 13. Beginner-friendly implementation order

Build in this order so each step runs in the browser.

1. **Vite + React + Tailwind** — empty `App` with “SpendWise” and `index.css`.
2. **`index.html` viewport** — confirm portrait phone in DevTools (375×812) has no horizontal scroll.
3. **Constants + `defaultAppData` + `dates` + `money`.**
4. **`budget.js`** — compute Appendix C from the spec on paper, then `console.log` a snapshot in `main.jsx` temporarily.
5. **`validation.js`** — call from a temporary button or unit checks.
6. **`storage.js` + SpendWiseContext** — load/save round-trip in React DevTools.
7. **AppShell + MobileBottomNav + DesktopSidebar** — placeholder pages, verify `md` breakpoint.
8. **SetupPage** — persist a `MonthPlan`, redirect if missing.
9. **AddExpensePage** — chips, large amount field, save transaction.
10. **DashboardPage** — snapshot cards, Food/Shopping, banners, MonthSwitcher.
11. **TransactionsPage** — cards, edit (`/add?id=`), delete.
12. **SettingsPage** — currency, export, reset.
13. **Polish** — 48px targets, `pb-24` for nav overlap, iOS 16px inputs, safe-area.
14. **Stop.** Do not add charts, import, PWA worker, or auth.

---

## PWA readiness (do not implement runtime yet)

Prepare files and comments only. **Do not** register a service worker. **Do not** add install buttons.

| Piece | Now (MVP) | Later |
|---|---|---|
| `public/manifest.webmanifest` | May add a **draft** file (name SpendWise, `display: standalone`, `theme_color`, icons paths) **without** linking it from `index.html` | `<link rel="manifest">` |
| Icons 192 / 512 | Empty folder or simple PNG later | Real maskable icon |
| `index.html` | Viewport only | `theme-color`, `apple-touch-icon`, `viewport-fit=cover` |
| Service worker | **Absent** | Caching shell + `spendwise.v1` stays in `localStorage` (SW must not invent a second database) |
| `vite-plugin-pwa` | **Not installed** | Add when you want installability |

When PWA is added, **architecture stays the same**: still no backend; installability is only a browser wrapper around this SPA.

Draft manifest fields (for later, not wired):

- `name`: SpendWise  
- `short_name`: SpendWise  
- `start_url`: `/`  
- `display`: `standalone`  
- `background_color` / `theme_color`: match the app header  
- `icons`: 192 and 512 PNG  

---

## Out of scope (repeat)

- Authentication, APIs, bank/UPI  
- Redux, React Query, chart libraries  
- Service worker, install prompt  
- Custom categories, JSON import, income transaction list  
- Horizontal data tables, desktop-only hover menus as the only way to Add  

---

## Quick decision log

| Topic | Decision |
|---|---|
| Router | Yes, React Router |
| Global state | One Context + `appData` |
| Persistence | Whole `AppData` JSON, key `spendwise.v1` |
| Nav | Bottom bar `< md`; sidebar `≥ md` |
| Add expense | Nav item visually primary; amount-first form |
| Lists | Cards, not tables |
| Charts | None |
| PWA | Files/plan only; no SW |
| Math | Only `lib/budget.js` |

*End of SpendWise architecture.*
