import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { NumericKeypad } from '@/components/ui/NumericKeypad';
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
  const [showKeypad, setShowKeypad] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close keypad when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowKeypad(false);
      }
    };

    if (showKeypad) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showKeypad]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="flex items-center gap-1">
        <Input
          type="text"
          readOnly
          placeholder={placeholder}
          value={value}
          onClick={() => !disabled && setShowKeypad(true)}
          className={cn(
            "cursor-pointer text-center",
            inputClassName
          )}
          disabled={disabled}
        />
        {showUnit && (
          <span className="text-muted-foreground shrink-0">°C</span>
        )}
      </div>

      {showKeypad && (
        <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2">
          <NumericKeypad
            value={value}
            onChange={onChange}
            onClose={() => setShowKeypad(false)}
            allowNegative={true}
            allowDecimal={true}
          />
        </div>
      )}
    </div>
  );
}
