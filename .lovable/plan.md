

## Add Unique CTR Column to Campaign Overview & Monthly Overview Tables

**What**: Add a "Unique CTR" column immediately after "Click %" in both the Campaign Overview (by Provider) and Monthly Overview tables. Unique CTR = Unique Clicks / Unique Opens × 100 (i.e., click-to-open rate), distinct from "Click %" which uses Sent/Delivered as denominator.

**Data source priority**: If the CSV contains a "Unique CTR" column, use its value directly. Otherwise, compute as `(uniqueClicked / uniqueViewed) * 100`.

---

### Step 1: Parse "Unique CTR" from CSV if present

**File: `src/lib/csvAnalyzer.ts`**

- Add `"unique ctr"` → `"uniqueCTR"` to `REQUIRED_HEADERS_MAP` (as an optional header — won't block parsing if missing).
- In `CampaignRow` interface, add `uniqueCTR: number` field.
- During row parsing (~line 718), read the CSV's "unique ctr" column if present. If the column exists and has a value, use it. Otherwise, compute: `uniqueViewed > 0 ? (uniqueClicked / uniqueViewed) * 100 : 0`.

### Step 2: Add `uniqueCTR` to aggregate interfaces and computation

**File: `src/lib/csvAnalyzer.ts`**

- Add `uniqueCTR: number` to `ProviderAggregate` and `MonthlyOverview` interfaces.
- In `generateAnalysisReport`:
  - For provider aggregates: after computing `clickPercent`, compute `uniqueCTR` from aggregated `uniqueViewed` and `uniqueClicked` (since per-row CTR can't be summed, it must be recalculated from aggregate totals: `uniqueClicked / uniqueViewed * 100`).
  - For monthly overview: same approach — compute from aggregated totals.

### Step 3: Render Unique CTR column in both tables

**File: `src/components/tabs/InboxDiagnosticsTab.tsx`**

- **Campaign Overview table** (~lines 1288–1365):
  - Add `<th>Unique CTR</th>` after "Click %" header (line 1299).
  - Add data cell after Click % (line 1322): render `p.uniqueCTR` with `<ColoredPercent metricType="clickRate" />`.
  - Add footer totals cell (line 1353): compute from aggregated totals `uniqueClicked / uniqueViewed * 100`.

- **Monthly Overview table** (~lines 1380–1432):
  - Add `<th>Unique CTR</th>` after "Click %" header (line 1393).
  - Add data cell after Click % (line 1422): render `m.uniqueCTR` with `<ColoredPercent metricType="clickRate" />`.

---

### Summary

- 2 files modified: `csvAnalyzer.ts` (interfaces + parsing + aggregation), `InboxDiagnosticsTab.tsx` (UI columns)
- CSV "Unique CTR" column is used directly when available; formula fallback `(Unique Clicked / Unique Viewed) × 100` only when the column is absent
- Color coding uses existing `clickRate` thresholds

