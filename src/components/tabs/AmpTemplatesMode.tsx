import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileCode, Wand2, Loader2, Eye, Code, Copy, Check, AlertTriangle,
  CheckCircle2, ShieldCheck, Sparkles, X, Upload,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listUseCaseTemplates, UseCaseTemplate } from "@/lib/useCaseTemplateService";
import { CoreBrandJSON, BrandDesignProfile } from "@/types/brandProfile";
import { validateAmpEmail, AmpValidationError } from "@/lib/ampEmailValidator";
import { autoFixAmpHtml } from "@/lib/ampAutoFix";

interface AmpTemplatesModeProps {
  brandProfile: CoreBrandJSON | null;
  brandDesignProfile?: BrandDesignProfile | null;
  websiteUrl?: string;
}

type ValidationBadge = "green" | "yellow" | "red";

export const AmpTemplatesMode: React.FC<AmpTemplatesModeProps> = ({
  brandProfile,
  brandDesignProfile,
  websiteUrl,
}) => {
  const [templates, setTemplates] = useState<UseCaseTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const [referenceHtml, setReferenceHtml] = useState<string>("");
  const [showReference, setShowReference] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [outputHtml, setOutputHtml] = useState<string>("");
  const [autoFixesApplied, setAutoFixesApplied] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<AmpValidationError[]>([]);
  const [view, setView] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await listUseCaseTemplates();
        setTemplates(data);
        if (data.length > 0) setSelectedTemplateId(data[0].id);
      } catch (e: any) {
        toast.error(`Failed to load templates: ${e?.message || e}`);
      } finally {
        setLoadingTemplates(false);
      }
    })();
  }, []);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) || null,
    [templates, selectedTemplateId],
  );

  const badge: ValidationBadge = useMemo(() => {
    if (!outputHtml) return "yellow";
    if (validationErrors.length === 0) return "green";
    const hard = validationErrors.some((e) =>
      ["required-amp4email-attr", "required-boilerplate", "no-script", "css-size-limit"].includes(e.rule),
    );
    return hard ? "red" : "yellow";
  }, [outputHtml, validationErrors]);

  const onReferenceFile = async (file: File) => {
    if (file.size > 500 * 1024) {
      toast.error("Reference file must be under 500 KB");
      return;
    }
    const text = await file.text();
    setReferenceHtml(text);
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) {
      toast.error("Pick a use case template first");
      return;
    }
    if (!brandProfile) {
      toast.error("Generate a brand profile first to enable AMP generation");
      return;
    }

    setGenerating(true);
    setOutputHtml("");
    setValidationErrors([]);
    setAutoFixesApplied([]);

    try {
      const { data, error } = await supabase.functions.invoke("amp-template-generate", {
        body: {
          templateHtml: selectedTemplate.htmlContent,
          templateLabel: selectedTemplate.label,
          brandProfile,
          brandDesignProfile: brandDesignProfile || brandProfile.brand_design_profile || null,
          referenceHtml: referenceHtml || undefined,
          websiteUrl,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const rawHtml = data.html as string;

      const fixed = autoFixAmpHtml(rawHtml, { baseUrl: websiteUrl });
      const validation = validateAmpEmail(fixed.html);

      setOutputHtml(fixed.html);
      setAutoFixesApplied(fixed.fixesApplied);
      setValidationErrors(validation.errors);

      if (validation.valid) {
        toast.success("Brand-styled AMP email generated and validated");
      } else {
        toast.warning(`Generated with ${validation.errors.length} validation warning(s)`);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to generate AMP email");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!outputHtml) return;
    navigator.clipboard.writeText(outputHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("HTML copied");
  };

  const badgeStyles: Record<ValidationBadge, { bg: string; text: string; label: string; Icon: any }> = {
    green: { bg: "bg-emerald-500/15 border-emerald-500/40", text: "text-emerald-500", label: "AMP Valid", Icon: CheckCircle2 },
    yellow: { bg: "bg-amber-500/15 border-amber-500/40", text: "text-amber-500", label: `${validationErrors.length} warning${validationErrors.length === 1 ? "" : "s"}`, Icon: AlertTriangle },
    red: { bg: "bg-destructive/15 border-destructive/40", text: "text-destructive", label: "Validation failed", Icon: AlertTriangle },
  };
  const B = badgeStyles[badge];

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="max-w-5xl mx-auto magic-card rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          AMP Templates — Brand-Aware Generation
        </h3>

        {/* Use Case Template */}
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            Use Case Template <span className="text-destructive">*</span>
          </label>
          {loadingTemplates ? (
            <div className="text-xs text-muted-foreground">Loading templates…</div>
          ) : templates.length === 0 ? (
            <div className="p-3 rounded-lg border border-dashed border-border text-xs text-muted-foreground">
              No templates yet. Upload one in <span className="font-medium text-foreground">Resource Library → Use Case Templates</span>.
            </div>
          ) : (
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} {t.ampValid ? "✓" : "⚠"}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Brand profile summary */}
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">Brand Profile</label>
          {brandProfile ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              <div
                className="w-8 h-8 rounded-md border border-border"
                style={{
                  background:
                    brandDesignProfile?.colors?.primary ||
                    brandProfile.brand_design_profile?.colors?.primary ||
                    "#6366f1",
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {brandProfile.brand_identity?.brand_name || "Untitled brand"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {brandProfile.brand_identity?.industry || "—"}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg border border-dashed border-destructive/40 text-xs text-destructive">
              Generate a brand profile in the Brand Inputs panel before generating an AMP email.
            </div>
          )}
        </div>

        {/* Reference HTML (optional) */}
        <div>
          <button
            onClick={() => setShowReference((s) => !s)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Upload className="w-3 h-3" />
            {showReference ? "Hide" : "Add"} brand reference HTML (optional)
          </button>
          <AnimatePresence>
            {showReference && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-2"
              >
                <div className="space-y-2">
                  <input
                    type="file"
                    accept=".html,.htm,text/html"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onReferenceFile(f);
                      e.target.value = "";
                    }}
                    className="text-xs"
                  />
                  <textarea
                    value={referenceHtml}
                    onChange={(e) => setReferenceHtml(e.target.value)}
                    placeholder="…or paste HTML from an existing brand email here"
                    className="w-full h-32 px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {referenceHtml && (
                    <button
                      onClick={() => setReferenceHtml("")}
                      className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> Clear reference
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Generate */}
        <div className="flex justify-end">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleGenerate}
            disabled={generating || !selectedTemplate || !brandProfile}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-magic text-primary-foreground font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" /> Generate Brand-Styled AMP
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Output */}
      {outputHtml && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-5xl mx-auto"
        >
          <div className="magic-card rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">
                  {selectedTemplate?.label || "Generated AMP Email"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-medium ${B.bg} ${B.text}`}
                >
                  <B.Icon className="w-3 h-3" />
                  {B.label}
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] text-muted-foreground hover:text-foreground border border-border hover:bg-muted/50"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy HTML"}
                </button>
              </div>
            </div>

            {/* Auto-fix summary */}
            {autoFixesApplied.length > 0 && (
              <div className="px-4 py-2 bg-emerald-500/5 border-b border-emerald-500/20 flex items-center gap-2 text-[11px] text-emerald-600">
                <ShieldCheck className="w-3 h-3" />
                Auto-fixes applied: {autoFixesApplied.join(" • ")}
              </div>
            )}

            {/* Validation warnings */}
            {validationErrors.length > 0 && (
              <div className="px-4 py-2 bg-amber-500/5 border-b border-amber-500/20 max-h-28 overflow-auto">
                <ul className="space-y-0.5 text-[11px] text-foreground/80">
                  {validationErrors.slice(0, 6).map((e, i) => (
                    <li key={i}>
                      <span className="font-mono text-amber-600">L{e.line}</span> · {e.rule}: {e.message}
                    </li>
                  ))}
                  {validationErrors.length > 6 && (
                    <li className="text-muted-foreground">+ {validationErrors.length - 6} more…</li>
                  )}
                </ul>
              </div>
            )}

            {/* Split pane */}
            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
              <div className="px-4 pt-3">
                <TabsList className="bg-muted/40">
                  <TabsTrigger value="preview" className="gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </TabsTrigger>
                  <TabsTrigger value="code" className="gap-1.5">
                    <Code className="w-3.5 h-3.5" /> HTML
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="preview" className="p-4">
                <div className="rounded-lg overflow-hidden border border-border bg-background">
                  <iframe
                    title="amp-preview"
                    srcDoc={outputHtml}
                    sandbox="allow-same-origin"
                    className="w-full"
                    style={{ minHeight: 600 }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="code" className="p-4">
                <pre className="p-3 text-[11px] font-mono text-foreground bg-muted/20 rounded-lg overflow-auto max-h-[600px] whitespace-pre-wrap break-all">
                  {outputHtml}
                </pre>
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      )}
    </div>
  );
};
