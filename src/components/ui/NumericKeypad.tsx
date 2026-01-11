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
    <div className="bg-background border rounded-lg shadow-lg p-3 w-full max-w-xs">
      {/* Display */}
      <div className="bg-muted rounded-md px-4 py-3 mb-3 text-right">
        <span className="text-2xl font-mono font-semibold text-foreground">
          {value || "0"}
        </span>
        <span className="text-muted-foreground ml-1">°C</span>
      </div>

      {/* Keypad Grid */}
      <div className="grid grid-cols-4 gap-2">
        {keys.map((row, rowIndex) =>
          row.map((key, colIndex) => (
            <Button
              key={`${rowIndex}-${colIndex}`}
              type="button"
              variant={key === "-" ? "secondary" : "outline"}
              className={`h-12 text-xl font-semibold ${
                key === "-" ? "text-blue-600 font-bold" : ""
              } ${key === "" ? "invisible" : ""}`}
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
          className="h-12 row-start-1"
          onClick={handleDelete}
        >
          <Delete className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 row-start-2 text-xs"
          onClick={handleClear}
        >
          C
        </Button>
        <Button
          type="button"
          variant="default"
          className="h-12 row-start-3 row-span-2 bg-primary hover:bg-primary/90"
          onClick={onClose}
        >
          <Check className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
