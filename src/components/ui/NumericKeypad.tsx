import { Button } from "@/components/ui/button";
import { Delete, Check } from "lucide-react";

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  allowNegative?: boolean;
  allowDecimal?: boolean;
}

export const NumericKeypad = ({
  value,
  onChange,
  onClose,
  allowNegative = true,
  allowDecimal = true,
}: NumericKeypadProps) => {
  const handleKeyPress = (key: string) => {
    if (key === "-") {
      // Toggle negative sign
      if (value.startsWith("-")) {
        onChange(value.substring(1));
      } else if (value === "" || value === "0") {
        onChange("-");
      } else {
        onChange("-" + value);
      }
    } else if (key === ".") {
      // Only add decimal if not already present
      if (!value.includes(".")) {
        onChange(value === "" || value === "-" ? value + "0." : value + ".");
      }
    } else {
      // Number key
      if (value === "0") {
        onChange(key);
      } else if (value === "-0") {
        onChange("-" + key);
      } else {
        onChange(value + key);
      }
    }
  };

  const handleDelete = () => {
    if (value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const handleClear = () => {
    onChange("");
  };

  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [allowNegative ? "-" : "", "0", allowDecimal ? "." : ""],
  ];

  return (
    <div className="bg-background border-2 border-border rounded-xl shadow-xl p-4 w-full max-w-sm">
      {/* Display */}
      <div className="bg-muted rounded-lg px-5 py-4 mb-4 text-right border border-border">
        <span className="text-3xl font-mono font-bold text-foreground tracking-wide">
          {value || "0"}
        </span>
        <span className="text-muted-foreground ml-2 text-lg">°C</span>
      </div>

      {/* Keypad Grid */}
      <div className="grid grid-cols-4 gap-3">
        {keys.map((row, rowIndex) =>
          row.map((key, colIndex) => (
            <Button
              key={`${rowIndex}-${colIndex}`}
              type="button"
              variant={key === "-" ? "secondary" : "outline"}
              className={`
                h-16 text-2xl font-bold rounded-lg
                transition-all duration-100 ease-out
                active:scale-95 active:shadow-inner
                ${key === "-" 
                  ? "bg-secondary text-primary hover:bg-secondary/80 active:bg-secondary/60" 
                  : "hover:bg-accent active:bg-accent/80"
                }
                ${key === "" ? "invisible" : ""}
                ${key === "." ? "text-muted-foreground" : ""}
              `}
              onClick={() => key && handleKeyPress(key)}
              disabled={key === ""}
            >
              {key}
            </Button>
          ))
        )}
        {/* Action buttons in the 4th column */}
        <Button
          type="button"
          variant="outline"
          className="h-16 row-start-1 rounded-lg transition-all duration-100 ease-out active:scale-95 active:shadow-inner hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive active:bg-destructive/20"
          onClick={handleDelete}
        >
          <Delete className="h-6 w-6" />
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-16 row-start-2 text-base font-bold rounded-lg transition-all duration-100 ease-out active:scale-95 active:shadow-inner hover:bg-warning/10 hover:border-warning/50 hover:text-warning active:bg-warning/20"
          onClick={handleClear}
        >
          C
        </Button>
        <Button
          type="button"
          variant="default"
          className="h-16 row-start-3 row-span-2 rounded-lg bg-primary hover:bg-primary/90 transition-all duration-100 ease-out active:scale-95 active:shadow-inner active:bg-primary/80"
          onClick={onClose}
        >
          <Check className="h-7 w-7" />
        </Button>
      </div>
    </div>
  );
};
