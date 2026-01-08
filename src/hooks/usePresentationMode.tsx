import React, { createContext, useContext, useState, ReactNode } from "react";

export type ViewMode = "app" | "presentation";
export type DeckType = "executive" | "detailed";

interface PresentationSlide {
  tab: "inbox-potential" | "use-case-studio" | "amp-email-studio";
  slideNumber: number;
  title: string;
  content: any;
}

interface PresentationContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  deckType: DeckType;
  setDeckType: (type: DeckType) => void;
  slides: PresentationSlide[];
  addSlide: (slide: PresentationSlide) => void;
  clearSlides: () => void;
  isExporting: boolean;
  setIsExporting: (exporting: boolean) => void;
}

const PresentationContext = createContext<PresentationContextType | undefined>(undefined);

export const PresentationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [viewMode, setViewMode] = useState<ViewMode>("app");
  const [deckType, setDeckType] = useState<DeckType>("executive");
  const [slides, setSlides] = useState<PresentationSlide[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const addSlide = (slide: PresentationSlide) => {
    setSlides(prev => [...prev, slide]);
  };

  const clearSlides = () => {
    setSlides([]);
  };

  return (
    <PresentationContext.Provider
      value={{
        viewMode,
        setViewMode,
        deckType,
        setDeckType,
        slides,
        addSlide,
        clearSlides,
        isExporting,
        setIsExporting,
      }}
    >
      {children}
    </PresentationContext.Provider>
  );
};

export const usePresentationMode = () => {
  const context = useContext(PresentationContext);
  if (!context) {
    throw new Error("usePresentationMode must be used within PresentationProvider");
  }
  return context;
};
