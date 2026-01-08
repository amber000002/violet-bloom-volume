import React from "react";
import { motion } from "framer-motion";

interface PresentationSlideProps {
  title: string;
  subtitle?: string;
  footer?: string;
  children: React.ReactNode;
  slideNumber?: number;
}

export const PresentationSlide: React.FC<PresentationSlideProps> = ({
  title,
  subtitle,
  footer,
  children,
  slideNumber,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-background rounded-2xl border border-border shadow-lg overflow-hidden"
      style={{ aspectRatio: "16/9", maxWidth: "900px" }}
    >
      <div className="h-full flex flex-col p-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            {title}
          </h2>
          {subtitle && (
            <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">{children}</div>

        {/* Footer */}
        {(footer || slideNumber) && (
          <div className="pt-4 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
            <span>{footer}</span>
            {slideNumber && <span>Slide {slideNumber}</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
};
