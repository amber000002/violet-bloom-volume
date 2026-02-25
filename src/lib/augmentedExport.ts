import { AugmentedUseCase } from "@/types/augmentedUseCase";

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
];

function escapeCSV(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
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
  ];
}

export function exportAugmentedCSV(useCases: AugmentedUseCase[], filename = "use-cases-augmented.csv") {
  const rows = [HEADERS, ...useCases.map(useCaseToRow)];
  const csv = rows.map(r => r.map(escapeCSV).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename);
}

export function exportAugmentedXLSX(useCases: AugmentedUseCase[], filename = "use-cases-augmented.xlsx") {
  // Build a simple XLSX-compatible XML (SpreadsheetML)
  const rows = [HEADERS, ...useCases.map(useCaseToRow)];
  
  const xmlRows = rows.map((row, ri) => {
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
