import React, { useEffect, useState } from "react";

const AMP_PREVIEW_SANDBOX = [
  "allow-scripts",
  "allow-same-origin",
  "allow-popups",
  "allow-popups-to-escape-sandbox",
  "allow-forms",
  "allow-downloads",
  "allow-top-navigation-by-user-activation",
].join(" ");

function preparePreviewHtml(html: string): string {
  if (!html) return "";
  if (/<base\b/i.test(html)) return html;

  const baseTag = '<base target="_blank" />';
  if (/<head\b[^>]*>/i.test(html)) {
    return html.replace(/<head\b([^>]*)>/i, `<head$1>${baseTag}`);
  }

  return html;
}

interface AmpEmailPreviewFrameProps
  extends Omit<React.IframeHTMLAttributes<HTMLIFrameElement>, "src" | "srcDoc" | "sandbox"> {
  html: string;
  allowInteraction?: boolean;
}

export const AmpEmailPreviewFrame: React.FC<AmpEmailPreviewFrameProps> = ({
  html,
  allowInteraction = true,
  className,
  ...props
}) => {
  const [src, setSrc] = useState("about:blank");

  useEffect(() => {
    const blob = new Blob([preparePreviewHtml(html)], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    setSrc(url);

    return () => URL.revokeObjectURL(url);
  }, [html]);

  return (
    <iframe
      {...props}
      src={src}
      sandbox={AMP_PREVIEW_SANDBOX}
      referrerPolicy="no-referrer"
      loading={props.loading ?? "lazy"}
      className={[className, allowInteraction ? "" : "pointer-events-none"].filter(Boolean).join(" ")}
    />
  );
};
