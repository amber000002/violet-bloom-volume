import React, { useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code, Eye, FileText, Loader2, Copy, Check, Upload,
  Sparkles, AlertCircle, ChevronDown, ImageIcon, X
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CoreBrandJSON } from "@/types/brandProfile";
import { builtInTemplates, builtInAmpTemplates, getTemplateForStage, getLifecycleStagesForIndustry } from "@/data/emailTemplates";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TemplateEngineModeProps {
  industry: string;
  brandProfile: CoreBrandJSON | null;
}

type TemplateType = "html" | "amp";
type ViewTab = "preview" | "html-code" | "amp-code";

interface GeneratedContent {
  subject: string;
  preheader: string;
  headline: string;
  subheadline: string;
  bodyText: string;
  ctaText: string;
  ctaUrl: string;
  supportingText: string;
  footerNote: string;
}

export const TemplateEngineMode: React.FC<TemplateEngineModeProps> = ({
  industry,
  brandProfile,
}) => {
  const lifecycleStages = useMemo(() => getLifecycleStagesForIndustry(industry), [industry]);

  const [selectedStage, setSelectedStage] = useState(lifecycleStages[0] || "Onboarding");
  const [templateType, setTemplateType] = useState<TemplateType>("html");
  const [viewTab, setViewTab] = useState<ViewTab>("preview");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [personalizedHtml, setPersonalizedHtml] = useState<string>("");
  const [personalizedAmp, setPersonalizedAmp] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [customTemplate, setCustomTemplate] = useState<string>("");
  const [showCustomUpload, setShowCustomUpload] = useState(false);

  // Reset stage if industry changes
  React.useEffect(() => {
    setSelectedStage(lifecycleStages[0] || "Onboarding");
    setGeneratedContent(null);
    setPersonalizedHtml("");
    setPersonalizedAmp("");
  }, [industry, lifecycleStages]);

  const brandColors = useMemo(() => {
    const colors = brandProfile?.brand_colors || brandProfile?.brand_design_profile?.colors;
    return {
      primary: colors?.primary || "#6366f1",
      secondary: colors?.secondary || "#8b5cf6",
      accent: colors?.accent || "#f59e0b",
      background: colors?.background || "#ffffff",
      text_primary: colors?.text_primary || "#1f2937",
    };
  }, [brandProfile]);

  const brandName = brandProfile?.brand_identity?.brand_name || "Brand";
  const logoUrl = brandProfile?.brand_design_profile?.logo?.logo_url || "";

  const applyContentToTemplate = useCallback((content: GeneratedContent, templateHtml: string): string => {
    let result = templateHtml;
    const tokens: Record<string, string> = {
      "{{subject}}": content.subject,
      "{{preheader}}": content.preheader,
      "{{headline}}": content.headline,
      "{{subheadline}}": content.subheadline,
      "{{body_text}}": content.bodyText,
      "{{cta_text}}": content.ctaText,
      "{{cta_url}}": content.ctaUrl || "#",
      "{{supporting_text}}": content.supportingText,
      "{{footer_note}}": content.footerNote,
      "{{brand_name}}": brandName,
      "{{logo_url}}": logoUrl,
      "{{primary_color}}": brandColors.primary,
      "{{secondary_color}}": brandColors.secondary,
      "{{accent_color}}": brandColors.accent,
      "{{background_color}}": brandColors.background,
      "{{text_color}}": brandColors.text_primary,
    };
    for (const [token, value] of Object.entries(tokens)) {
      result = result.split(token).join(value);
    }
    return result;
  }, [brandName, logoUrl, brandColors]);

  const handleGenerate = useCallback(async () => {
    if (!industry) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("template-personalize", {
        body: {
          brandProfile,
          industry,
          stage: selectedStage,
          templateType,
          customTemplate: customTemplate || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const content = data.content as GeneratedContent;
      setGeneratedContent(content);

      if (data.isCustomTemplate && data.personalizedHtml) {
        // Custom template: use the AI-rewritten HTML directly
        setPersonalizedHtml(data.personalizedHtml);
        setPersonalizedAmp("");
      } else {
        // Built-in template: apply token replacement
        const htmlTemplate = getTemplateForStage(selectedStage, "html").html;
        setPersonalizedHtml(applyContentToTemplate(content, htmlTemplate));

        const ampTemplate = getTemplateForStage(selectedStage, "amp").html;
        setPersonalizedAmp(applyContentToTemplate(content, ampTemplate));
      }

      toast.success("Template personalized successfully!");
    } catch (err: any) {
      console.error("Template personalization error:", err);
      toast.error(err.message || "Failed to personalize template");
    } finally {
      setIsGenerating(false);
    }
  }, [industry, brandProfile, selectedStage, templateType, customTemplate, applyContentToTemplate]);

  const handleCopyCode = useCallback(() => {
    const code = viewTab === "amp-code" ? personalizedAmp : personalizedHtml;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Code copied to clipboard!");
  }, [viewTab, personalizedAmp, personalizedHtml]);

  const handleCustomTemplateUpload = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomTemplate(e.target.value);
  }, []);

  return (
    <div className="space-y-6">
      {/* Lifecycle Stage Tabs */}
      <div className="flex flex-wrap gap-2 justify-center">
        {lifecycleStages.map((stage) => (
          <motion.button
            key={stage}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setSelectedStage(stage);
              setGeneratedContent(null);
              setPersonalizedHtml("");
              setPersonalizedAmp("");
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedStage === stage
                ? "bg-gradient-magic text-primary-foreground shadow-magic"
                : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border"
            }`}
          >
            {stage}
          </motion.button>
        ))}
      </div>

      {/* Controls Row */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        {/* Template Type Toggle */}
        <div className="flex gap-2 p-1 rounded-lg bg-muted/50 border border-border">
          {(["html", "amp"] as TemplateType[]).map((type) => (
            <button
              key={type}
              onClick={() => setTemplateType(type)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                templateType === type
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {type.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Custom Template Toggle */}
        <button
          onClick={() => setShowCustomUpload(!showCustomUpload)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground border border-border hover:bg-muted/50 transition-all"
        >
          <Upload className="w-3.5 h-3.5" />
          Custom Template
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCustomUpload ? "rotate-180" : ""}`} />
        </button>

        {/* Generate Button */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleGenerate}
          disabled={isGenerating || !brandProfile}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-magic text-primary-foreground font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Personalizing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Personalize Template
            </>
          )}
        </motion.button>
      </div>

      {/* Brand profile warning */}
      {!brandProfile && (
        <div className="flex items-center gap-2 justify-center text-sm text-destructive">
          <AlertCircle className="w-4 h-4" />
          Generate a brand profile first to enable template personalization.
        </div>
      )}

      {/* Custom Template Input */}
      <AnimatePresence>
        {showCustomUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="max-w-4xl mx-auto">
              <label className="block text-sm font-medium text-foreground mb-2">
                Paste your custom HTML/AMP template
              </label>
              <textarea
                value={customTemplate}
                onChange={handleCustomTemplateUpload}
                placeholder="Paste your HTML or AMP email template here. Use tokens like {{headline}}, {{body_text}}, {{cta_text}}, {{brand_name}}, {{primary_color}} for personalization..."
                className="w-full h-40 px-4 py-3 rounded-lg bg-muted/50 border border-border text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Available tokens: {"{{headline}}"}, {"{{subheadline}}"}, {"{{body_text}}"}, {"{{cta_text}}"}, {"{{cta_url}}"}, {"{{brand_name}}"}, {"{{logo_url}}"}, {"{{primary_color}}"}, {"{{secondary_color}}"}, {"{{accent_color}}"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Output Section */}
      {generatedContent && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Content Summary */}
          <div className="max-w-4xl mx-auto magic-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Content Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { label: "Subject", value: generatedContent.subject },
                { label: "Preheader", value: generatedContent.preheader },
                { label: "Headline", value: generatedContent.headline },
                { label: "CTA", value: generatedContent.ctaText },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-2">
                  <span className="text-xs font-medium text-muted-foreground min-w-[80px]">{label}:</span>
                  <span className="text-xs text-foreground">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Preview / Code Tabs */}
          <div className="max-w-4xl mx-auto">
            <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as ViewTab)}>
              <div className="flex items-center justify-between mb-3">
                <TabsList className="bg-muted/50">
                  <TabsTrigger value="preview" className="gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </TabsTrigger>
                  <TabsTrigger value="html-code" className="gap-1.5">
                    <Code className="w-3.5 h-3.5" /> HTML Code
                  </TabsTrigger>
                  <TabsTrigger value="amp-code" className="gap-1.5">
                    <Code className="w-3.5 h-3.5" /> AMP Code
                  </TabsTrigger>
                </TabsList>

                {(viewTab === "html-code" || viewTab === "amp-code") && (
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:bg-muted/50 transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied!" : "Copy Code"}
                  </button>
                )}
              </div>

              <TabsContent value="preview">
                <div className="magic-card rounded-xl overflow-hidden">
                  {/* Email client chrome */}
                  <div className="bg-muted/50 px-4 py-2.5 border-b border-border flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-destructive/50" />
                      <div className="w-2.5 h-2.5 rounded-full bg-stardust/50" />
                      <div className="w-2.5 h-2.5 rounded-full bg-accent/50" />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {templateType.toUpperCase()} Email Preview — {selectedStage}
                    </span>
                  </div>
                  <div className="bg-background p-0">
                    <div
                      className="w-full"
                      style={{ minHeight: 600 }}
                      dangerouslySetInnerHTML={{
                        __html: templateType === "amp" ? personalizedAmp : personalizedHtml,
                      }}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="html-code">
                <div className="magic-card rounded-xl overflow-hidden">
                  <pre className="p-4 text-xs font-mono text-foreground bg-muted/20 overflow-auto max-h-[500px] whitespace-pre-wrap break-all">
                    {personalizedHtml}
                  </pre>
                </div>
              </TabsContent>

              <TabsContent value="amp-code">
                <div className="magic-card rounded-xl overflow-hidden">
                  <pre className="p-4 text-xs font-mono text-foreground bg-muted/20 overflow-auto max-h-[500px] whitespace-pre-wrap break-all">
                    {personalizedAmp}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      )}
    </div>
  );
};
