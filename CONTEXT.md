# Stroberi - Product Context

## What is Stroberi?

Stroberi is a **privacy-first personal expense tracker** for iOS and Android. It helps users understand where their money goes without compromising their financial privacy.

### Core Value Proposition

> "Track your spending, keep your privacy. All your financial data stays on your device."

**Key Differentiators:**
- 🔒 **100% Local Storage** - No accounts, no cloud sync, no data collection
- 🌍 **Multi-Currency Native** - Built for people who spend in multiple currencies
- 📊 **Visual Insights** - Understand spending patterns through intuitive charts
- ⚡ **Friction-Free** - Add transactions in seconds, not minutes

---

## Target Users

### Primary Persona: The Privacy-Conscious Tracker
- Wants to track expenses but won't use apps that upload data
- May have tried spreadsheets but wants something more visual
- Values simplicity over feature bloat
- Needs quick entry while on-the-go

### Secondary Persona: The Multi-Currency Traveler
- Lives in one country, travels/shops internationally
- Deals with multiple currencies regularly
- Needs automatic conversion to understand true spending
- Wants all finances visible in their home currency

### Tertiary Persona: The Budget-Setter
- Has specific spending goals
- Wants alerts before overspending
- Needs category-based budget tracking
- Values the "envelope budgeting" mentality

---

## User Journeys

### Journey 1: First Launch
```
Open App → Select Default Currency → See Empty Home Screen → 
Tap "Add Expense" or "Add Income" → Create First Transaction → 
See Transaction in List → Explore Charts (empty state)
```

**First-Time Experience:**
- Currency selection is mandatory before first transaction
- Empty states encourage action with clear CTAs
- Default categories pre-seeded for immediate use

### Journey 2: Daily Expense Logging
```
Open App → Tap Quick Add Button → Enter Amount → 
Select Category (optional) → Add Merchant Name (optional) → 
Save → See Updated Overview
```

**Design Decisions:**
- Amount is the only required field
- Category defaults to "Uncategorized" if not selected
- Date defaults to "now" but can be changed
- Currency defaults to user's base currency

### Journey 3: Understanding Spending
```
Open Home Screen → Swipe Through Charts → 
View "Spend by Category" → Change Time Period → 
Identify Top Spending Area → Navigate to Transactions → 
Filter by Category → Review Individual Transactions
```

**Insight Flow:**
1. High-level overview (income, expense, balance)
2. Category breakdown (where money goes)
3. Trend analysis (spending over time)
4. Transaction drill-down (specific purchases)

### Journey 4: Setting Up a Budget
```
Settings → Enable Budgeting → Go to Budgets Tab → 
Create Budget → Set Amount & Period → 
Link Categories (optional) → Set Alert Threshold → 
Monitor Progress on Home Screen
```

**Budget Workflow:**
- Budgeting is opt-in (off by default)
- Can budget all spending or specific categories
- Alerts appear on home screen when approaching limit
- Visual progress bar shows current status

### Journey 5: Importing Historical Data
```
Settings → CSV Import → Download Template → 
Fill Template with Data → Import CSV → 
Review Progress → See Imported Transactions
```

**Import Experience:**
- Template ensures correct format
- Validation catches errors before import
- New categories auto-created from data
- Progress indicator for large imports

---

## Feature Breakdown

### 📝 Transaction Management

**What users can do:**
- Add income (positive) or expenses (negative)
- Set any of 36 currencies per transaction
- Assign categories with emoji icons
- Add merchant/payee names
- Write notes for context
- Edit any transaction details
- Delete with confirmation

**How it feels:**
- Amount entry is prominent and immediate
- Currency picker is searchable
- Category selection shows recent/most-used first
- Swipe gestures for quick edit/delete

### 📊 Analytics Dashboard

**Five Insight Views (swipeable carousel):**

1. **Period Overview**
   - Total income, expenses, and net balance
   - Transaction count
   - Top spending category
   - Customizable date range

2. **Expense Breakdown**
   - Monthly expense totals
   - Bar chart visualization
   - See spending momentum over months

3. **Income Breakdown**
   - Monthly income totals
   - Track income consistency
   - Identify income growth/decline

4. **Category Spending**
   - Top categories ranked by amount
   - This month / Last month / This year
   - Visual bar comparison

5. **Spending Trends**
   - Daily spending this month
   - Last 30 days view
   - Weekly aggregate view
   - Line chart showing patterns

### 🏷️ Categories

**Pre-loaded Categories:**
| Category | Icon | Typical Use |
|----------|------|-------------|
| Food | 🍔 | Restaurants, takeout |
| Groceries | 🍎 | Supermarket shopping |
| Transport | 🚗 | Gas, uber, transit |
| Entertainment | 🎮 | Movies, games, streaming |
| Shopping | 🛍️ | Retail purchases |
| Health | 🏥 | Medical, pharmacy |
| Utilities | 💡 | Bills, subscriptions |
| Rent | 🏠 | Housing costs |
| Travel | ✈️ | Trips, hotels |
| Education | 🎓 | Courses, books |
| Personal Care | 🧼 | Grooming, wellness |
| Gifts | 🎁 | Presents given |
| Employment | 💰 | Salary, freelance income |
| Other | 📦 | Miscellaneous |

**Custom Categories:**
- Create unlimited custom categories
- Choose any emoji as icon
- Edit or delete anytime
- Usage tracking for smart ordering

### 💱 Multi-Currency

**Supported Currencies (36):**
USD, EUR, GBP, JPY, CNY, RUB, INR, BRL, MXN, AUD, CAD, CHF, ZAR, SEK, NOK, KRW, TRY, NZD, SGD, HKD, PLN, DKK, HUF, CZK, ILS, CLP, PHP, AED, COP, SAR, MYR, RON, IDR, THB, RSD, BAM

**How it works:**
1. User sets a "base currency" (their home currency)
2. Each transaction can be in any currency
3. App automatically converts to base currency
4. Exchange rates cached for 24 hours
5. All analytics shown in base currency for consistency

**Example:**
> User (base: USD) logs €50 at a Paris restaurant
> App converts: €50 → $54.25 at current rate
> Transaction stored with both amounts
> Analytics show $54.25 for spending totals

### 🔄 Recurring Transactions

**Use Cases:**
- Monthly subscriptions (Netflix, Spotify)
- Regular bills (rent, utilities)
- Salary deposits
- Weekly allowances

**Configuration:**
- Set frequency: Daily, Weekly, Monthly, Yearly
- Define start date
- Optional end date
- Toggle active/inactive

**Behavior:**
- Transactions created automatically when due
- App checks on launch and when reopened
- Shows recurring indicator icon on transactions
- Original template editable anytime

### 💰 Budgets (Optional Feature)

**Enable via:** Settings → Features → Enable Budgeting

**Budget Types:**
- **Weekly Budget** - Resets every 7 days
- **Monthly Budget** - Resets on same date each month
- **Yearly Budget** - Annual spending limit

**Category Linking:**
- Budget ALL spending (no categories selected)
- Budget SPECIFIC categories (e.g., only "Food" and "Entertainment")

**Alerts & Tracking:**
- Set alert threshold (e.g., 80%)
- Home screen card shows budgets approaching limit
- Visual progress bar with color states:
  - 🟢 Green: Under threshold
  - 🟡 Yellow: At or above threshold
  - 🔴 Red: Exceeded 100%

**Rollover Option:**
- Enable to carry unused budget to next period
- Example: $100 budget, spent $80 → Next month has $120

### 📤 Data Export

**Export Options:**
- Select date range
- Choose columns to include
- Export as CSV or JSON
- Preview count before export

**Default Columns:**
- Date, Amount, Merchant, Category, Currency, Note

**Extended Columns:**
- Base currency code, Amount in base currency, Exchange rate

### 📥 Data Import

**Process:**
1. Download CSV template
2. Fill with transaction data
3. Import into app
4. Validation checks format
5. New categories auto-created
6. Transactions added in batches

**Required Fields:**
- `merchant` - Who/where
- `amount` - Number (negative for expense)
- `date` - YYYY-MM-DD format
- `currencyCode` - 3-letter code

**Optional Fields:**
- `note` - Additional context
- `category` - Category name
- `categoryIcon` - Emoji for new categories

---

## Navigation Structure

```
┌─────────────────────────────────────────────┐
│                   App                        │
├─────────────────────────────────────────────┤
│  [Home]  [Transactions]  [Budgets*]  [Settings]
│    │           │             │           │
│    │           │             │           ├─ Default Currency
│    │           │             │           ├─ Manage Categories
│    │           │             │           ├─ Recurring Transactions
│    │           │             │           ├─ Enable Budgeting Toggle
│    │           │             │           ├─ CSV Export
│    │           │             │           ├─ CSV Import
│    │           │             │           ├─ Privacy Policy
│    │           │             │           └─ Terms & Conditions
│    │           │             │
│    │           │             └─ Budget List
│    │           │                 └─ Budget Form (create/edit)
│    │           │
│    │           └─ Transaction List
│    │               ├─ Date Filter
│    │               ├─ Category Filter
│    │               └─ Transaction Details (swipe)
│    │
│    └─ Overview Carousel
│        ├─ Spend Overview (custom date range)
│        ├─ Expense Breakdown
│        ├─ Income Breakdown
│        ├─ Category Spending
│        └─ Spending Trends
│
│  [+ Add Expense]  [+ Add Income]  ← Floating buttons
│        │
│        └─ Transaction Form
│            ├─ Amount + Currency
│            ├─ Date + Time
│            ├─ Merchant
│            ├─ Category
│            └─ Notes
└─────────────────────────────────────────────┘

* Budgets tab only visible when budgeting enabled
```

---

## Interaction Patterns

### Bottom Sheets
Used for: Forms, filters, selections, confirmations
- Swipe down to dismiss
- Backdrop tap to close
- Dynamic height based on content

### Swipe Actions
Used for: Transaction list items
- Swipe left reveals: Edit (gray), Delete (red)
- Spring animation on release

### Carousel
Used for: Home screen charts
- Horizontal swipe between views
- Pagination dots indicate position
- Each card is independently interactive

### Pull-to-Scroll
Used for: Transaction list
- Scroll to top on tab tap
- Grouped by date headers

### Date/Time Pickers
Used for: Transaction date, filter ranges, budget dates
- Native platform pickers
- Separate date and time selection

### Search & Filter
Used for: Transactions, categories, currencies
- Real-time filtering
- Badge shows active filter count
- Clear all option

---

## Empty States

### No Transactions Yet
**Message:** "Create your first transaction to get started"
**Actions:** [Add Expense] [Add Income]

### No Budgets Yet
**Message:** "Take control of your spending by setting budgets"
**Subtext:** "Create weekly, monthly, or yearly budgets to track your expenses"
**Action:** [Create Your First Budget]

### No Data in Chart
**Message:** "No spending data for this period"
**Guidance:** Suggests changing time filter

### No Categories Match Search
**Message:** "No categories found"
**Action:** Option to create new category

### Empty Import
**Message:** "Your CSV file doesn't contain any transaction data"
**Action:** [Download Template] [Try Again]

---

## Error Handling

### Currency Conversion Failed
- Falls back to secondary API
- If both fail, uses rate of 1 (same currency assumption)
- No error shown to user, graceful degradation

### Invalid CSV Format
- Shows specific error message
- Lists which rows/columns have issues
- Offers template download
- Retry option

### Transaction Save Failed
- Toast notification with error
- Form stays open with data preserved
- Retry possible

### Budget Alert Dismissed
- Persisted locally
- Won't show again for that budget/period
- Resets on new period

---

## Product Decisions & Rationale

### Why Local-Only?
- Privacy is the #1 feature
- No server costs = sustainable free app
- Works offline anywhere
- User owns their data completely

### Why Multi-Currency Native?
- Globalization of spending (online purchases, travel)
- Single-currency apps frustrating for travelers
- Automatic conversion removes mental math

### Why Optional Budgeting?
- Not everyone budgets
- Keeps UI clean for casual trackers
- Power feature for those who want it

### Why Emoji Icons?
- Universal, cross-platform
- Visually distinctive at small sizes
- Fun, personal customization
- No icon pack licensing needed

### Why No Recurring Auto-Sync?
- Can't guarantee app runs in background
- User opens app → transactions created
- Simple, predictable behavior
- No battery drain from background tasks

### Why Swipe Actions vs Buttons?
- Cleaner list UI
- Familiar iOS/Android pattern
- Edit and delete are rare actions
- Space for transaction info maximized

---

## Success Metrics (User Perspective)

### Engagement
- Transactions logged per week
- Days with app opens
- Chart carousel engagement (swipes)

### Retention
- Users returning after 7 days
- Users with 30+ transactions
- Budgeting feature adoption

### Value Delivered
- Categories created (customization)
- Recurring transactions set up
- CSV exports performed
- Budgets that trigger alerts (catching overspend)

---

## Future Considerations

### Potential Enhancements
- 📸 Receipt photo attachment
- 🏦 Bank statement parsing
- 📈 Year-over-year comparisons
- 🎯 Savings goals
- 👥 Shared expense splitting
- 📱 Widget for quick add
- 🔔 Spending reminders
- 🌙 Scheduled reports

### Won't Do (by design)
- ❌ Cloud sync / accounts
- ❌ Bank connections / Plaid
- ❌ Social features
- ❌ Advertising
- ❌ Premium tiers

---

## Brand Identity

### Name
**Stroberi** - Fresh, approachable, memorable. The strawberry 🍓 connects to the red brand color.

### Color Palette
- **Stroberi Red** (#E54B4B) - Expenses, alerts, brand accent
- **Money Green** (hsl 151, 50%, 53%) - Income, success
- **Warning Yellow** - Budget approaching limit
- **Pure Black** - Background, dark mode native

### Voice & Tone
- Friendly, not corporate
- Direct, not verbose
- Encouraging, not judgmental
- Privacy-proud, not paranoid

### Messaging Examples
- ✅ "Your data stays on your device"
- ✅ "Track spending in any currency"
- ✅ "See where your money goes"
- ❌ "Syncs across all your devices" (we don't do this)
- ❌ "AI-powered insights" (not our approach)
