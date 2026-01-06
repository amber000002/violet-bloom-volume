import * as React from "react";
import { motion } from "framer-motion";

interface Option {
  value: string;
  label: string;
  description?: string;
}

interface MagicRadioProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  className?: string;
}

export const MagicRadio: React.FC<MagicRadioProps> = ({
  value,
  onValueChange,
  options,
  className,
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {options.map((option) => (
        <motion.button
          key={option.value}
          type="button"
          onClick={() => onValueChange(option.value)}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className={`w-full p-4 rounded-lg border text-left transition-all duration-300 ${
            value === option.value
              ? "border-primary bg-primary/10 shadow-md"
              : "border-border bg-muted/30 hover:border-primary/50"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                value === option.value
                  ? "border-primary bg-primary"
                  : "border-muted-foreground"
              }`}
            >
              {value === option.value && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2 h-2 rounded-full bg-primary-foreground"
                />
              )}
            </div>
            <div>
              <p className="font-medium text-foreground">{option.label}</p>
              {option.description && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {option.description}
                </p>
              )}
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
};
