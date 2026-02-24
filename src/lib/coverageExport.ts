import { MatchTrace } from "@/lib/coverageNormalization";
import { CampaignRow } from "@/lib/csvAnalyzer";

interface MappedCampaignExport {
  campaign: CampaignRow;
  useCaseName: string | null;
  useCaseId: string | null;
  stage: string | null;
  framework: string | null;
  source: string;
  matchConfidence: string;
  matchTrace: MatchTrace;
}

const HEADERS = [
  "Campaign Name",
  "Subject / Title",
  "Use Case",
  "Lifecycle Stage",
  "Framework",
  "Source",
  "Match Confidence",
  "Volume (Sends)",
  "Delivery Type",
  "Conversion Event",
  "Labels",
  "Who Query",
  // MatchTrace columns
  "Match Source",
  "Matched Use Case ID",
  "Evidence Fields Used",
  "Match Reason Codes",
];

function campaignToRow(m: MappedCampaignExport): string[] {
  const c = m.campaign;
  return [
    c.campaignName || "",
    c.title || c.subjectLine || "",
    m.useCaseName || "Unclassified",
    m.stage || "Unassigned",
    m.framework || "—",
    m.source === "internal" ? "Internal Resource" : m.source === "lovable-inferred" ? "Lovable Inferred" : "Unclassified",
    m.matchConfidence,
    String(c.totalSentUsers || 0),
    c.deliveryType || "",
    c.conversionEvent || "",
    c.labels || "",
    c.whoQuery || "",
    // MatchTrace
    m.matchTrace.matchSource,
    m.matchTrace.matchedUseCaseId || "",
    m.matchTrace.evidenceFieldsUsed.join("; "),
    m.matchTrace.matchReasonCodes.join("; "),
  ];
}

function escapeCSV(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportCoverageCSV(mapped: MappedCampaignExport[], filename = "use-case-coverage-analysis.csv") {
  const rows = [HEADERS, ...mapped.map(campaignToRow)];
  const csv = rows.map(r => r.map(escapeCSV).join(",")).join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), filename);
}

export function exportCoverageXLSX(mapped: MappedCampaignExport[], filename = "use-case-coverage-analysis.xlsx") {
  const rows = [HEADERS, ...mapped.map(campaignToRow)];

  const xmlRows = rows.map((row) => {
    const cells = row.map((cell) => {
      const escaped = cell.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `<Cell><Data ss:Type="String">${escaped}</Data></Cell>`;
    }).join("");
    return `<Row>${cells}</Row>`;
  }).join("\n");

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Use Case Coverage">
<Table>
${xmlRows}
</Table>
</Worksheet>
</Workbook>`;

  downloadBlob(new Blob([xml], { type: "application/vnd.ms-excel" }), filename);
}
