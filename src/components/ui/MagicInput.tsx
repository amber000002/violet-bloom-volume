import * as React from "react";

interface MagicInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  className?: string;
  type?: string;
}

export const MagicInput: React.FC<MagicInputProps> = ({
  value,
  onChange,
  placeholder,
  helperText,
  className,
  type = "text",
}) => {
  const formatNumber = (val: string) => {
    const num = val.replace(/[^0-9]/g, "");
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (type === "number") {
      onChange(formatNumber(e.target.value));
    } else {
      onChange(e.target.value);
    }
  };

  return (
    <div className={className}>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full h-12 px-4 rounded-lg border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
      />
      {helperText && (
        <p className="mt-2 text-sm text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
};
