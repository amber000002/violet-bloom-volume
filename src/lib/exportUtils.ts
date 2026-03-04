import { toPng } from "html-to-image";

/**
 * Export a DOM element as a PNG image download.
 */
export async function exportElementAsPNG(
  element: HTMLElement,
  filename: string = "export.png"
): Promise<void> {
  const dataUrl = await toPng(element, {
    backgroundColor: "#ffffff",
    pixelRatio: 2,
    style: {
      // Ensure all content is visible during capture
      overflow: "visible",
      maxHeight: "none",
    },
  });
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

/**
 * Export creative analysis data as a structured text file.
 */
export function exportCreativeAnalysisAsText(
  analysis: {
    effectivePractices: { area: string; practice: string }[];
    riskAreas: { area: string; observation: string; impact: string }[];
    improvements: string[];
  },
  filename: string = "creative-analysis.txt"
): void {
  const lines: string[] = [];

  lines.push("CREATIVE & CONTENT EFFECTIVENESS ANALYSIS");
  lines.push("=".repeat(50));
  lines.push("");

  lines.push("EFFECTIVE DESIGN & CONTENT PRACTICES");
  lines.push("-".repeat(40));
  analysis.effectivePractices.forEach((p, i) => {
    lines.push(`${i + 1}. [${p.area}] ${p.practice}`);
  });
  lines.push("");

  lines.push("DESIGN & CONTENT RISK AREAS");
  lines.push("-".repeat(40));
  analysis.riskAreas.forEach((r, i) => {
    lines.push(`${i + 1}. [${r.area}] ${r.observation}`);
    lines.push(`   Impact: ${r.impact}`);
  });
  lines.push("");

  lines.push("RECOMMENDED OPTIMIZATIONS");
  lines.push("-".repeat(40));
  analysis.improvements.forEach((imp, i) => {
    lines.push(`${i + 1}. ${imp}`);
  });

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export creative analysis data as CSV.
 */
export function exportCreativeAnalysisAsCSV(
  analysis: {
    effectivePractices: { area: string; practice: string }[];
    riskAreas: { area: string; observation: string; impact: string }[];
    improvements: string[];
  },
  filename: string = "creative-analysis.csv"
): void {
  const escapeCSV = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const rows: string[] = [];

  // Effective Practices
  rows.push("Section,Area,Detail,Impact");
  analysis.effectivePractices.forEach((p) => {
    rows.push(`${escapeCSV("Effective Practice")},${escapeCSV(p.area)},${escapeCSV(p.practice)},`);
  });

  // Risk Areas
  analysis.riskAreas.forEach((r) => {
    rows.push(`${escapeCSV("Risk Area")},${escapeCSV(r.area)},${escapeCSV(r.observation)},${escapeCSV(r.impact)}`);
  });

  // Improvements
  analysis.improvements.forEach((imp, i) => {
    rows.push(`${escapeCSV("Optimization")},${escapeCSV(`#${i + 1}`)},${escapeCSV(imp)},`);
  });

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
