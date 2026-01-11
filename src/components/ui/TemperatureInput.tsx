import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TemperatureInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  showUnit?: boolean;
  disabled?: boolean;
}

export function TemperatureInput({
  value,
  onChange,
  placeholder = "0",
  className,
  inputClassName,
  showUnit = false,
  disabled = false,
}: TemperatureInputProps) {
  const handleToggleSign = () => {
    if (value.startsWith("-")) {
      onChange(value.substring(1));
    } else if (value && value !== "0") {
      onChange("-" + value);
    } else if (value === "") {
      onChange("-");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Allow empty, minus sign, numbers, and decimal point
    if (/^-?\d*\.?\d*$/.test(newValue) || newValue === "-") {
      onChange(newValue);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleToggleSign}
          disabled={disabled}
          className="shrink-0 h-10 w-10 text-lg font-bold"
        >
          ±
        </Button>
        <Input
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          className={cn("text-center", inputClassName)}
          disabled={disabled}
        />
        {showUnit && (
          <span className="text-muted-foreground shrink-0">°C</span>
        )}
      </div>
    </div>
  );
}
