import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MagicSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  className?: string;
}

export const MagicSelect: React.FC<MagicSelectProps> = ({
  value,
  onValueChange,
  placeholder,
  options,
  className,
}) => {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={`h-12 border-border bg-muted/50 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 ${className}`}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-card border-border z-50 max-h-[300px]">
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="text-foreground hover:bg-muted focus:bg-muted cursor-pointer"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
