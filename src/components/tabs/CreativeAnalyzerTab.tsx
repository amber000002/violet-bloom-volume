import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  X,
  Image as ImageIcon,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CreativeAnalyzerSlides } from "@/components/presentation/CreativeAnalyzerSlides";
import { RecentFilesDropdown } from "@/components/RecentFilesDropdown";
import { addRecentFile } from "@/lib/recentFilesStore";

interface AnalysisData {
  effectivePractices: { area: string; practice: string }[];
  riskAreas: { area: string; observation: string; impact: string }[];
  improvements: string[];
  context?: string;
}

interface CreativeAnalyzerTabProps {
  industry: string;
  viewMode?: "app" | "presentation";
  onDataChange?: (data: AnalysisData | null) => void;
}

const practiceAreas = [
  "Branding",
  "Layout",
  "Visuals",
  "Content",
  "Accessibility",
  "Compliance",
];

const riskAreaOptions = [
  "Header",
  "CTA",
  "Visual Hierarchy",
  "Content Structure",
  "Images & GIFs",
  "Footer",
  "Mobile Optimization",
  "Load Time",
];

export const CreativeAnalyzerTab: React.FC<CreativeAnalyzerTabProps> = ({
  industry,
  viewMode = "app",
  onDataChange,
}) => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [additionalContext, setAdditionalContext] = useState("");
  const [analysisComplete, setAnalysisComplete] = useState(false);

  // Effective practices state
  const [effectivePractices, setEffectivePractices] = useState<
    { area: string; practice: string }[]
  >([]);

  // Risk areas state
  const [riskAreas, setRiskAreas] = useState<
    { area: string; observation: string; impact: string }[]
  >([]);

  // Improvements state
  const [improvements, setImprovements] = useState<string[]>([""]);

  useEffect(() => {
    if (onDataChange && analysisComplete) {
      onDataChange({
        effectivePractices,
        riskAreas,
        improvements: improvements.filter((i) => i.trim() !== ""),
        context: additionalContext || undefined,
      });
    }
  }, [
    effectivePractices,
    riskAreas,
    improvements,
    additionalContext,
    analysisComplete,
    onDataChange,
  ]);

  const acceptCreativeFile = (file: File) => {
    if (!file || !(file.type === "image/png" || file.type === "image/jpeg")) return;
    addRecentFile("creative-image", file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) acceptCreativeFile(file);
  };

  const removeImage = () => {
    setUploadedImage(null);
    setAnalysisComplete(false);
  };

  const addEffectivePractice = () => {
    setEffectivePractices([...effectivePractices, { area: "", practice: "" }]);
  };

  const updateEffectivePractice = (
    index: number,
    field: "area" | "practice",
    value: string
  ) => {
    const updated = [...effectivePractices];
    updated[index][field] = value;
    setEffectivePractices(updated);
  };

  const removeEffectivePractice = (index: number) => {
    setEffectivePractices(effectivePractices.filter((_, i) => i !== index));
  };

  const addRiskArea = () => {
    setRiskAreas([...riskAreas, { area: "", observation: "", impact: "" }]);
  };

  const updateRiskArea = (
    index: number,
    field: "area" | "observation" | "impact",
    value: string
  ) => {
    const updated = [...riskAreas];
    updated[index][field] = value;
    setRiskAreas(updated);
  };

  const removeRiskArea = (index: number) => {
    setRiskAreas(riskAreas.filter((_, i) => i !== index));
  };

  const addImprovement = () => {
    setImprovements([...improvements, ""]);
  };

  const updateImprovement = (index: number, value: string) => {
    const updated = [...improvements];
    updated[index] = value;
    setImprovements(updated);
  };

  const removeImprovement = (index: number) => {
    if (improvements.length > 1) {
      setImprovements(improvements.filter((_, i) => i !== index));
    }
  };

  const startAnalysis = () => {
    setAnalysisComplete(true);
  };

  if (!industry) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          Select an industry vertical to begin your creative analysis.
        </p>
      </div>
    );
  }

  if (viewMode === "presentation" && analysisComplete) {
    return (
      <CreativeAnalyzerSlides
        effectivePractices={effectivePractices}
        riskAreas={riskAreas}
        improvements={improvements.filter((i) => i.trim() !== "")}
        context={additionalContext}
        imagePreview={uploadedImage}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border border-border p-6"
      >
        <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" />
          Email Creative Upload
        </h3>

        {!uploadedImage ? (
          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-muted/30">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <ImageIcon className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-semibold">Click to upload</span> or drag
                and drop
              </p>
              <p className="text-xs text-muted-foreground">
                PNG or JPG (single creative)
              </p>
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/png,image/jpeg"
              onChange={handleImageUpload}
            />
          </label>
        ) : (
          <div className="relative">
            <img
              src={uploadedImage}
              alt="Uploaded creative"
              className="w-full max-h-64 object-contain rounded-lg border border-border"
            />
            <button
              onClick={removeImage}
              className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Additional Context */}
        <div className="mt-4">
          <label className="text-sm font-medium text-foreground mb-2 block">
            Additional Context (Optional)
          </label>
          <Textarea
            placeholder="Add any additional context to improve analysis (e.g., email is getting clipped, long scroll, low CTR, deliverability issues, AMP email, etc.)"
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            className="min-h-[80px]"
          />
        </div>

        {uploadedImage && !analysisComplete && (
          <Button onClick={startAnalysis} className="mt-4 w-full">
            Begin Manual Analysis
          </Button>
        )}
      </motion.div>

      {/* Analysis Sections */}
      <AnimatePresence>
        {analysisComplete && (
          <>
            {/* Section A: Effective Practices */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-xl border border-border p-6"
            >
              <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Effective Design & Content Practices
              </h3>

              <div className="space-y-3">
                {effectivePractices.map((practice, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <select
                      value={practice.area}
                      onChange={(e) =>
                        updateEffectivePractice(index, "area", e.target.value)
                      }
                      className="w-32 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    >
                      <option value="">Area</option>
                      {practiceAreas.map((area) => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={practice.practice}
                      onChange={(e) =>
                        updateEffectivePractice(
                          index,
                          "practice",
                          e.target.value
                        )
                      }
                      placeholder="Describe the effective practice..."
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    />
                    <button
                      onClick={() => removeEffectivePractice(index)}
                      className="p-2 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addEffectivePractice}
                >
                  + Add Practice
                </Button>
              </div>
            </motion.div>

            {/* Section B: Risk Areas */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-xl border border-border p-6"
            >
              <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Design & Content Risk Areas
              </h3>

              <div className="space-y-3">
                {riskAreas.map((risk, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2 items-start"
                  >
                    <select
                      value={risk.area}
                      onChange={(e) =>
                        updateRiskArea(index, "area", e.target.value)
                      }
                      className="col-span-2 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    >
                      <option value="">Area</option>
                      {riskAreaOptions.map((area) => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={risk.observation}
                      onChange={(e) =>
                        updateRiskArea(index, "observation", e.target.value)
                      }
                      placeholder="What's wrong..."
                      className="col-span-5 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      value={risk.impact}
                      onChange={(e) =>
                        updateRiskArea(index, "impact", e.target.value)
                      }
                      placeholder="Impact (CTR, accessibility, etc.)"
                      className="col-span-4 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    />
                    <button
                      onClick={() => removeRiskArea(index)}
                      className="col-span-1 p-2 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addRiskArea}>
                  + Add Risk Area
                </Button>
              </div>
            </motion.div>

            {/* Section C: Improvements */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card rounded-xl border border-border p-6"
            >
              <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                Recommended Optimizations
              </h3>

              <div className="space-y-3">
                {improvements.map((improvement, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <span className="w-6 h-6 flex items-center justify-center bg-primary/10 text-primary rounded-full text-xs font-medium">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={improvement}
                      onChange={(e) => updateImprovement(index, e.target.value)}
                      placeholder="Enter actionable improvement..."
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    />
                    <button
                      onClick={() => removeImprovement(index)}
                      className="p-2 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {improvements.length < 7 && (
                  <Button variant="outline" size="sm" onClick={addImprovement}>
                    + Add Improvement
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground mt-4">
                Aim for 5-7 concise, action-oriented recommendations
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
