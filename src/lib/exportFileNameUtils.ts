/**
 * Generate a timestamp string in YYYY-MM-DD_HH-MM-SS format.
 */
export const formatExportTimestamp = (): string => {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
};

/**
 * Build an export filename using the source file name (if provided) or a fallback,
 * appended with a timestamp.
 *
 * @param sourceFileName - Original uploaded filename (e.g. "CampaignData.csv")
 * @param fallbackBase - Fallback base name if no source file (without extension)
 * @returns Filename with .pptx extension
 */
export const buildExportFileName = (
  sourceFileName: string | undefined,
  fallbackBase: string,
): string => {
  const timestamp = formatExportTimestamp();
  if (sourceFileName) {
    // Strip extension from source filename
    const base = sourceFileName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_\-]/g, "_");
    return `${base}_${timestamp}.pptx`;
  }
  return `${fallbackBase}_${timestamp}.pptx`;
};
