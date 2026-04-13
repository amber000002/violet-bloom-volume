

## Plan: Per-Table Insights Engine Grounded in CleverTap Best Practices

### What changes

Replace the current single-string `SectionInsightBanner` (one lightbulb + plain text per section) with a multi-insight block that renders up to 4 severity-classified, source-attributed insights below each table/chart. The existing `sectionInsightEngine.ts` is replaced entirely.

---

### Technical design

#### 1. New insight data model (`src/lib/sectionInsightEngine.ts` — full rewrite)

```typescript
type InsightSeverity = "critical" | "warning" | "info" | "positive";

interface TableInsight {
  severity: InsightSeverity;
  text: string;
  source: string; // e.g. "Sender Reputation", "IP Warmup", "Email Sunsetting", "Email Best Practices"
}

interface SectionInsights {
  campaignOverview: TableInsight[];
  monthlyOverview: TableInsight[];
  emailMetricsTrend: TableInsight[];
  infrastructureReputation: TableInsight[];
  reputationTrends: TableInsight[];
  bestPerformingCTR: TableInsight[];
  underperformingCTR: TableInsight[];
  sendMixCoverage: TableInsight[];
  lifecycleCoverage: TableInsight[];
  keyLearnings: TableInsight[];
}
```

Each generator function returns `TableInsight[]` (max 4), sorted Critical first, Positive last. Thresholds and recommendations are sourced exclusively from the three CleverTap docs pages fetched above:

| Doc section | Key thresholds / rules to encode |
|---|---|
| **Email Best Practices — Sending Volume** | No gap > 30 days between sends |
| **Email Best Practices — Audience Selection** | 0-3 month engaged = low risk, 4-5 = medium, 6+ = high risk; 80:20 engaged:inactive ratio |
| **Email Best Practices — Campaign Content** | Email < 102KB, 70:30 text:image, CTA in top 20%, include unsubscribe link |
| **IP Warmup** | Gradual volume increase; reputation evaluated on rolling 30-day basis; verify lists before warmup; separate promo/transactional subdomains |
| **Email Sunsetting** | Sunset users inactive > 6 months; re-engagement journey before permanent exclusion |
| **Email Best Practices — Campaign Results** | Review metrics within 12-24 hours |

Per-section generation logic (deterministic, no AI calls):

- **Campaign Overview**: Volume concentration across providers, bounce rate vs. best practice, unsubscribe rate thresholds
- **Monthly Overview**: 30-day send gap detection, volume surge detection (warmup violation), CTR/open trends
- **Email Metrics Trend**: Bounce rate spikes, engagement volatility, consistent decline patterns
- **Infrastructure Details**: Reputation below HIGH, mixed domain/IP signals
- **Reputation Trends**: Spam ratio breaches, reputation fluctuation frequency, error ratio persistence
- **Best/Underperforming Campaigns**: Open rate patterns, bounce correlation, audience targeting signals
- **Send Mix**: Promotional vs transactional subdomain separation signal, automation maturity
- **Lifecycle Coverage**: Sunsetting gap detection, lifecycle stage gaps
- **Key Learnings**: Composite summary of highest-severity findings

#### 2. New UI component (`src/components/tabs/InboxDiagnosticsTab.tsx`)

Replace `SectionInsightBanner` with a new `SectionInsightsBlock`:

```text
┌─────────────────────────────────────────────────┐
│ 🔴 Hard bounce rate at 4.2% exceeds safe       │
│    threshold — verify email lists before sends  │
│    Source: IP Warmup                            │
├─────────────────────────────────────────────────┤
│ 🟡 Send volume gap of 45 days detected between │
│    Oct and Dec — ISPs re-evaluate reputation    │
│    after 30-day inactivity                      │
│    Source: Email Best Practices — Sending Volume│
├─────────────────────────────────────────────────┤
│ 🟢 Unsubscribe rate at 0.1% — healthy signal   │
│    Source: Email Best Practices                 │
└─────────────────────────────────────────────────┘
```

Visual spec:
- Left border color: red (`border-l-red-500`), amber (`border-l-amber-500`), blue (`border-l-blue-500`), green (`border-l-green-500`)
- Text size: `text-xs` (smaller than table body `text-sm`)
- Source tag: `text-[10px] text-muted-foreground italic` right-aligned or inline
- Container: `mt-3 space-y-1.5`, each insight is a `border-l-4 pl-3 py-1.5` block
- Hidden when array is empty (FR-2 satisfied by generator returning `[]` for empty data)

#### 3. Remove old fields

- Remove `rootCauseSummary` from `SectionInsights` (no longer a separate section)
- Remove old `SectionInsightBanner` component
- Update all `<SectionInsightBanner insight={...} />` calls to `<SectionInsightsBlock insights={...} />`

#### 4. PPT export update (`src/lib/diagnosticsPptExport.ts`)

- Add `sectionInsights?: SectionInsights` to `DiagnosticsDeckOptions`
- After each table slide, render insight rows as a small sub-table or text block below the main table:
  - Severity dot (colored circle shape) + insight text + source tag in 7pt font
  - Match on-screen layout: insights appear on the same slide as their table, below it
  - Skip if insights array is empty for that section

#### 5. Files modified

| File | Change |
|---|---|
| `src/lib/sectionInsightEngine.ts` | Full rewrite — new interfaces, per-section generators with CleverTap-grounded logic |
| `src/components/tabs/InboxDiagnosticsTab.tsx` | Replace `SectionInsightBanner` with `SectionInsightsBlock`; update all call sites |
| `src/lib/diagnosticsPptExport.ts` | Accept and render `sectionInsights` on applicable slides |
| `src/components/InboxAlchemy.tsx` | Pass `sectionInsights` into PPT export options (if not already) |

No new dependencies. No database changes. No API calls.

