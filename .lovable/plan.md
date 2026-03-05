

## Plan: Use uploaded filename in PPT export filenames

### What changes

**3 files** need updates to include the uploaded CSV filename and a timestamp in the exported PPT filename, using the pattern `{originalFilename}_{YYYY-MM-DD}_{HH-MM-SS}.pptx`.

### 1. `src/lib/diagnosticsPptExport.ts`
- Add `sourceFileName?: string` to `DiagnosticsDeckOptions` interface.
- Update the filename construction (line ~1262) to use the source filename (stripped of extension) + date/time instead of the current brand-based name.
- Also update the early-return filename (line ~373) similarly.
- Format: `CampaignData_2026-03-05_14-30-22.pptx`

### 2. `src/components/tabs/InboxDiagnosticsTab.tsx`
- Pass `campaignFileName` (already tracked in state) as `sourceFileName` to both `exportDiagnosticsToPPT` call sites (lines ~1391 and ~2125).

### 3. `src/lib/pptExport.ts`
- Update the filename (line ~649) to include a timestamp: `Inbox_Alchemy_Executive_Deck_2026-03-05_14-30-22.pptx`. (No uploaded file applies here since this is the main deck export from InboxAlchemy, not diagnostics.)

### Filename format helper
A small utility function to generate the timestamp string (`YYYY-MM-DD_HH-MM-SS`) will be added, used by both export files.

