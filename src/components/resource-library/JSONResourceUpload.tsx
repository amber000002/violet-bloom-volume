import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileJson,
  CheckCircle,
  AlertCircle,
  X,
  Info,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
} from "lucide-react";
import { useResourceLibrary } from "@/contexts/ResourceLibraryContext";
import { JSONResourceFile, JSONValidationResult } from "@/types/resources";

interface JSONResourceUploadProps {
  onClose: () => void;
}

// Sample JSON template for users - demonstrates document-driven stages
const sampleTemplate: JSONResourceFile = {
  metadata: {
    source: "CleverTap OTT Playbook",
    version: "1.0",
    last_updated: new Date().toISOString().split("T")[0],
    author: "Marketing Team",
    description: "OTT industry use cases for lifecycle marketing",
  },
  use_cases: [
    {
      use_case_id: "ott_onboarding_001",
      name: "Welcome Series Journey",
      type: "journey",
      trigger_type: "event",
      description: "Triggered when a new user completes registration. Guides them through content discovery.",
      stage: "activation",
      framework: "lifecycle",
      industry: "ott",
      tabs: ["use-case-studio"],
      channels: ["Email", "Push", "In-App"],
      is_primary: true,
      events: ["User Registered", "Profile Completed"],
      segments: ["New Users"],
    },
    {
      use_case_id: "ott_engagement_001",
      name: "Trending Content Discovery",
      type: "campaign",
      purpose: "Drive repeat content consumption using trending titles",
      timing: "Weekly on Fridays",
      suppression: "Skip if user watched in last 24 hours",
      stage: "engagement",
      framework: "lifecycle",
      industry: "ott",
      tabs: ["use-case-studio"],
      channels: ["Email", "Push"],
    },
    {
      use_case_id: "ott_monetization_001",
      name: "Premium Upsell Campaign",
      type: "campaign",
      purpose: "Convert free or basic users to premium plans",
      timing: "After 7 days of active usage",
      suppression: "Skip if already premium subscriber",
      stage: "monetization",
      framework: "lifecycle",
      industry: "ott",
      tabs: ["use-case-studio"],
      channels: ["Email", "In-App", "WhatsApp"],
    },
    {
      use_case_id: "ott_winback_001",
      name: "Dormant User Reactivation Journey",
      type: "journey",
      trigger_type: "segment",
      description: "Re-engage users who have stopped watching content for 30+ days",
      stage: "winback",
      framework: "lifecycle",
      industry: "ott",
      tabs: ["use-case-studio"],
      channels: ["Email", "SMS", "Push"],
    },
  ],
};

export const JSONResourceUpload: React.FC<JSONResourceUploadProps> = ({ onClose }) => {
  const { addResourcesFromJSON } = useResourceLibrary();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<JSONValidationResult | null>(null);
  const [showTemplate, setShowTemplate] = useState(false);
  const [fileName, setFileName] = useState<string>("");

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith(".json")) {
      setResult({
        isValid: false,
        errors: ["File must be a .json file"],
        parsedUseCases: 0,
        duplicatesSkipped: 0,
        updatedUseCases: 0,
      });
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);
    setResult(null);

    try {
      const text = await file.text();
      const json = JSON.parse(text) as JSONResourceFile;
      
      // Validate and add to library
      const validationResult = await addResourcesFromJSON(json);
      setResult(validationResult);
    } catch (error) {
      setResult({
        isValid: false,
        errors: [error instanceof Error ? error.message : "Failed to parse JSON file"],
        parsedUseCases: 0,
        duplicatesSkipped: 0,
        updatedUseCases: 0,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const copyTemplate = () => {
    navigator.clipboard.writeText(JSON.stringify(sampleTemplate, null, 2));
  };

  const downloadTemplate = () => {
    const blob = new Blob([JSON.stringify(sampleTemplate, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resource-template.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <FileJson className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-display font-semibold text-foreground">
              Upload JSON Resource
            </h3>
            <p className="text-xs text-muted-foreground">
              Bulk import use cases from structured JSON
            </p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-2">
        <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <div className="text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">JSON Ingestion Rules:</p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>Each use_case is treated as an authoritative unit</li>
            <li>Re-uploading merges by <code className="px-1 bg-muted rounded">use_case_id</code></li>
            <li>Existing IDs are updated, new IDs are added</li>
            <li>Internal resources always override native intelligence</li>
          </ul>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
        />

        {isProcessing ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Processing {fileName}...</p>
          </div>
        ) : (
          <>
            <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
            <p className="text-sm font-medium text-foreground">
              Drop your JSON file here
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              or click to browse
            </p>
          </>
        )}
      </div>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-lg border ${
              result.isValid
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-destructive/10 border-destructive/30"
            }`}
          >
            <div className="flex items-start gap-2">
              {result.isValid ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${result.isValid ? "text-emerald-400" : "text-destructive"}`}>
                  {result.isValid ? "Successfully processed!" : "Validation failed"}
                </p>
                
                {result.isValid ? (
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <p>✓ {result.parsedUseCases} use cases added</p>
                    {result.updatedUseCases > 0 && (
                      <p>↻ {result.updatedUseCases} existing use cases updated</p>
                    )}
                    {result.duplicatesSkipped > 0 && (
                      <p>⊘ {result.duplicatesSkipped} unchanged duplicates skipped</p>
                    )}
                  </div>
                ) : (
                  <ul className="mt-2 space-y-1 text-xs text-destructive/80">
                    {(result.errors ?? []).map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {result.isValid && (
              <button
                onClick={onClose}
                className="mt-4 w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium transition-colors"
              >
                Done
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Template Section */}
      <div className="border-t border-border pt-4">
        <button
          onClick={() => setShowTemplate(!showTemplate)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <FileJson className="w-4 h-4" />
          <span>View JSON template</span>
          {showTemplate ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        <AnimatePresence>
          {showTemplate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-2"
            >
              <div className="flex gap-2">
                <button
                  onClick={copyTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </button>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              </div>
              <pre className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground overflow-x-auto max-h-64 overflow-y-auto">
                {JSON.stringify(sampleTemplate, null, 2)}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};