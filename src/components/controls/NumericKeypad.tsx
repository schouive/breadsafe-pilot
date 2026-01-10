import { Button } from '@/components/ui/button';
import { Delete, Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  onConfirm?: () => void;
  allowNegative?: boolean;
  allowDecimal?: boolean;
  className?: string;
}

export function NumericKeypad({ 
  value, 
  onChange, 
  onConfirm,
  allowNegative = true,
  allowDecimal = true,
  className 
}: NumericKeypadProps) {
  
  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      onChange(value.slice(0, -1));
      return;
    }
    
    if (key === 'clear') {
      onChange('');
      return;
    }
    
    if (key === '-') {
      if (allowNegative) {
        if (value.startsWith('-')) {
          onChange(value.slice(1));
        } else {
          onChange('-' + value);
        }
      }
      return;
    }
    
    if (key === '.') {
      if (allowDecimal && !value.includes('.')) {
        onChange(value + '.');
      }
      return;
    }
    
    // Number keys
    onChange(value + key);
  };

  const keys = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    [allowNegative ? '-' : '', '0', allowDecimal ? '.' : '']
  ];

  return (
    <div className={cn("grid gap-2", className)}>
      {/* Display */}
      <div className="bg-muted rounded-lg p-4 text-center mb-2">
        <span className="text-3xl font-bold tabular-nums">
          {value || '0'}
        </span>
        <span className="text-2xl text-muted-foreground ml-1">°C</span>
      </div>
      
      {/* Keypad grid */}
      <div className="grid grid-cols-4 gap-2">
        {/* Number keys - 3 columns */}
        <div className="col-span-3 grid grid-cols-3 gap-2">
          {keys.map((row, rowIndex) => (
            row.map((key, keyIndex) => (
              key ? (
                <Button
                  key={`${rowIndex}-${keyIndex}`}
                  type="button"
                  variant="outline"
                  className="h-14 text-xl font-semibold hover:bg-primary/10 active:bg-primary/20 transition-colors"
                  onClick={() => handleKeyPress(key)}
                >
                  {key === '-' ? <Minus className="h-5 w-5" /> : key}
                </Button>
              ) : (
                <div key={`${rowIndex}-${keyIndex}`} className="h-14" />
              )
            ))
          ))}
        </div>
        
        {/* Action keys - 1 column */}
        <div className="grid grid-rows-4 gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-14 text-lg hover:bg-destructive/10 active:bg-destructive/20"
            onClick={() => handleKeyPress('clear')}
          >
            C
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-14 hover:bg-muted active:bg-muted/80"
            onClick={() => handleKeyPress('backspace')}
          >
            <Delete className="h-5 w-5" />
          </Button>
          {onConfirm ? (
            <Button
              type="button"
              className="h-14 row-span-2 bg-success hover:bg-success/90 text-success-foreground"
              onClick={onConfirm}
              disabled={!value}
            >
              <Check className="h-6 w-6" />
            </Button>
          ) : (
            <>
              <div className="h-14" />
              <div className="h-14" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
