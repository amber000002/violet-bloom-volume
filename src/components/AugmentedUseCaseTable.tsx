import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, Lightbulb, Sparkles, BookOpen, Download } from "lucide-react";
import { AugmentedUseCase } from "@/types/augmentedUseCase";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

interface AugmentedUseCaseTableProps {
  useCases: AugmentedUseCase[];
  onExportCSV: () => void;
  onExportXLSX: () => void;
}

const confidenceBadge = (level: string) => {
  switch (level) {
    case "High":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3" /> High
        </span>
      );
    case "Medium":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-yellow-400 bg-yellow-500/10 border border-yellow-500/30">
          <AlertTriangle className="w-3 h-3" /> Medium
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-muted-foreground bg-muted/30 border border-border">
          <Lightbulb className="w-3 h-3" /> Low
        </span>
      );
  }
};

const sourceBadge = (source: string) => {
  const isInternal = source === "Internal";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      isInternal ? "bg-emerald-500/10 text-emerald-400" : "bg-primary/10 text-primary"
    }`}>
      {isInternal ? <BookOpen className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
      {source}
    </span>
  );
};

export const AugmentedUseCaseTable: React.FC<AugmentedUseCaseTableProps> = ({
  useCases,
  onExportCSV,
  onExportXLSX,
}) => {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {/* Export buttons */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {useCases.length} augmented use cases
        </div>
        <div className="flex gap-2">
          <button
            onClick={onExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={onExportXLSX}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export XLSX
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[220px]">Use Case Title</TableHead>
              <TableHead className="w-[120px]">Lifecycle Stage</TableHead>
              <TableHead className="w-[100px]">Confidence</TableHead>
              <TableHead className="w-[130px]">Source</TableHead>
              <TableHead className="w-[140px]">Channels</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {useCases.map((uc, idx) => (
              <React.Fragment key={idx}>
                <TableRow
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                >
                  <TableCell className="font-medium text-foreground text-sm">
                    {uc.use_case_title}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {uc.lifecycle_stage}
                    </span>
                  </TableCell>
                  <TableCell>{confidenceBadge(uc.confidence_level)}</TableCell>
                  <TableCell>{sourceBadge(uc.source)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {uc.channels.map((ch) => (
                        <span key={ch} className="px-1.5 py-0.5 rounded bg-muted/50 text-xs text-muted-foreground">
                          {ch}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {expandedRow === idx ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </TableCell>
                </TableRow>

                {/* Expanded detail row */}
                <AnimatePresence>
                  {expandedRow === idx && (
                    <tr>
                      <td colSpan={6} className="p-0">
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-muted/10 border-t border-border"
                        >
                          <div className="p-5 grid grid-cols-2 gap-4 text-sm">
                            <DetailBlock label="Why It Matters" value={uc.why_it_matters} />
                            <DetailBlock label="Execution Strategy" value={uc.execution_strategy} />
                            <DetailBlock label="Trigger Logic" value={uc.trigger_logic} />
                            <DetailBlock label="Segmentation Logic" value={uc.segmentation_logic} />
                            <DetailBlock
                              label="Metrics to Impact"
                              value={uc.metrics_to_impact.join(", ")}
                            />
                            <DetailBlock label="Risk Overlay" value={uc.risk_overlay || "None"} />
                            <div className="col-span-2">
                              <DetailBlock
                                label="Why This Fits This Brand"
                                value={uc.why_this_fits_brand}
                                highlight
                              />
                            </div>
                            <div className="col-span-2">
                              <span className="text-xs font-medium text-foreground">Personalization Layers Applied</span>
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {uc.personalization_layers.map((layer, i) => (
                                  <span key={i} className="px-2 py-1 rounded-full bg-primary/10 text-xs text-primary">
                                    {layer}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

const DetailBlock: React.FC<{ label: string; value: string; highlight?: boolean }> = ({
  label,
  value,
  highlight,
}) => (
  <div>
    <span className="text-xs font-medium text-foreground">{label}</span>
    <p className={`text-xs mt-1 ${highlight ? "p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-muted-foreground" : "text-muted-foreground"}`}>
      {value}
    </p>
  </div>
);
