import { AugmentedUseCase, ExecutionDetail } from "@/types/augmentedUseCase";
import { normalizeChannel } from "./channelNormalization";

const CHANNEL_COLUMNS: { key: string; label: string; aliases: string[] }[] = [
  { key: "email", label: "Channel-Specific Execution (Email)", aliases: ["email"] },
  { key: "in_app", label: "Channel-Specific Execution (In-App)", aliases: ["in_app", "inapp", "in-app"] },
  { key: "whatsapp", label: "Channel-Specific Execution (WhatsApp)", aliases: ["whatsapp", "wa"] },
  { key: "sms", label: "Channel-Specific Execution (SMS)", aliases: ["sms"] },
  { key: "push", label: "Channel-Specific Execution (Push)", aliases: ["push", "web_push", "webpush"] },
];

const HEADERS = [
  "Use Case Title",
  "Lifecycle Stage",
  "Confidence Level",
  "Source",
  "Channels",
  "Why It Matters",
  "Execution Strategy",
  "Trigger Logic",
  "Segmentation Logic",
  "Metrics to Impact",
  "Risk Overlay",
  "Why This Fits This Brand",
  "Personalization Layers Applied",
  ...CHANNEL_COLUMNS.map(c => c.label),
];

function escapeCSV(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function formatDetail(detail: ExecutionDetail): string {
  const fieldEntries = Object.entries(detail.fields || {})
    .map(([key, value]) => `${key.replace(/_/g, " ")}: ${value}`)
    .join("; ");
  return `Trigger: ${detail.trigger}${fieldEntries ? " | " + fieldEntries : ""}`;
}

function executionForChannel(uc: AugmentedUseCase, aliases: string[]): string {
  if (!uc.execution_details || uc.execution_details.length === 0) return "";
  const matches = uc.execution_details.filter((d) => {
    const norm = normalizeChannel(d.channel || "");
    return aliases.includes(norm as string) || aliases.includes((d.channel || "").toLowerCase().trim());
  });
  if (matches.length === 0) return "";
  return matches.map(formatDetail).join(" /// ");
}

function useCaseToRow(uc: AugmentedUseCase): string[] {
  return [
    uc.use_case_title,
    uc.lifecycle_stage,
    uc.confidence_level,
    uc.source,
    uc.channels.join(", "),
    uc.why_it_matters,
    uc.execution_strategy,
    uc.trigger_logic,
    uc.segmentation_logic,
    uc.metrics_to_impact.join(", "),
    uc.risk_overlay || "",
    uc.why_this_fits_brand,
    uc.personalization_layers.join(", "),
    ...CHANNEL_COLUMNS.map(c => executionForChannel(uc, c.aliases)),
  ];
}

export function exportAugmentedCSV(useCases: AugmentedUseCase[], filename = "use-cases-augmented.csv") {
  const rows = [HEADERS, ...useCases.map(useCaseToRow)];
  const csv = rows.map(r => r.map(escapeCSV).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename);
}

export function exportAugmentedXLSX(useCases: AugmentedUseCase[], filename = "use-cases-augmented.xlsx") {
  const rows = [HEADERS, ...useCases.map(useCaseToRow)];
  
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
<Worksheet ss:Name="Augmented Use Cases">
<Table>
${xmlRows}
</Table>
</Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  downloadBlob(blob, filename);
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
