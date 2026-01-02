'use client';

import { useState, useCallback } from 'react';
import { Delete } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface QuantityKeypadProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
  maxQuantity: number;
  productName?: string;
  resetKey?: number; // Used to force reset when dialog opens
}

export function QuantityKeypad({
  isOpen,
  onClose,
  onConfirm,
  maxQuantity,
  productName,
  resetKey = 0,
}: QuantityKeypadProps) {
  const [value, setValue] = useState<string>('');
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  
  // Reset value when resetKey changes
  if (resetKey !== lastResetKey) {
    setValue('');
    setLastResetKey(resetKey);
  }

  // Handle dialog close
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  // Handle number press
  const handleNumberPress = useCallback((num: string) => {
    setValue((prev) => {
      if (prev === '' || prev === '0') return num;
      const newValue = prev + num;
      const numValue = parseInt(newValue, 10);
      if (numValue > maxQuantity) return maxQuantity.toString();
      return newValue;
    });
  }, [maxQuantity]);

  // Handle clear
  const handleClear = useCallback(() => {
    setValue('');
  }, []);

  // Handle backspace
  const handleBackspace = useCallback(() => {
    setValue((prev) => {
      if (prev.length <= 1) return '';
      return prev.slice(0, -1);
    });
  }, []);

  // Handle confirm
  const handleConfirm = useCallback(() => {
    const quantity = parseInt(value, 10);
    if (quantity > 0 && quantity <= maxQuantity) {
      onConfirm(quantity);
      onClose();
    }
  }, [value, maxQuantity, onConfirm, onClose]);

  const numValue = parseInt(value, 10) || 0;
  const isValid = numValue > 0 && numValue <= maxQuantity;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[340px] p-0 overflow-hidden rounded-3xl">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-center text-sm font-medium text-muted-foreground uppercase tracking-wide">
            ТОО ХЭМЖЭЭ
          </DialogTitle>
        </DialogHeader>

        {/* Display */}
        <div className="px-5 pb-3">
          <div className="bg-gray-100 rounded-2xl py-5 px-6 text-center min-h-[80px] flex items-center justify-center">
            {value ? (
              <span className={cn(
                "text-5xl font-bold transition-colors",
                isValid ? "text-amber-500" : "text-red-500"
              )}>
                {value}
              </span>
            ) : (
              <span className="text-5xl font-bold text-gray-300">
                _
              </span>
            )}
          </div>
          {productName && (
            <p className="text-center text-xs text-muted-foreground mt-2 truncate px-2">
              {productName}
            </p>
          )}
          {!isValid && numValue > maxQuantity && (
            <p className="text-center text-xs text-red-500 mt-2">
              Хамгийн ихдээ {maxQuantity} ширхэг
            </p>
          )}
        </div>

        {/* Keypad */}
        <div className="bg-gray-50 px-4 pb-5 pt-3">
          <div className="grid grid-cols-3 gap-2.5">
            {/* Row 1 */}
            {['1', '2', '3'].map((num) => (
              <Button
                key={num}
                variant="outline"
                className="h-14 text-2xl font-semibold bg-white hover:bg-gray-100 rounded-2xl border-gray-200 shadow-sm"
                onClick={() => handleNumberPress(num)}
              >
                {num}
              </Button>
            ))}

            {/* Row 2 */}
            {['4', '5', '6'].map((num) => (
              <Button
                key={num}
                variant="outline"
                className="h-14 text-2xl font-semibold bg-white hover:bg-gray-100 rounded-2xl border-gray-200 shadow-sm"
                onClick={() => handleNumberPress(num)}
              >
                {num}
              </Button>
            ))}

            {/* Row 3 */}
            {['7', '8', '9'].map((num) => (
              <Button
                key={num}
                variant="outline"
                className="h-14 text-2xl font-semibold bg-white hover:bg-gray-100 rounded-2xl border-gray-200 shadow-sm"
                onClick={() => handleNumberPress(num)}
              >
                {num}
              </Button>
            ))}

            {/* Row 4 */}
            <Button
              variant="outline"
              className="h-14 text-2xl font-bold bg-red-50 hover:bg-red-100 text-red-500 rounded-2xl border-red-200 shadow-sm"
              onClick={handleClear}
            >
              C
            </Button>
            <Button
              variant="outline"
              className="h-14 text-2xl font-semibold bg-white hover:bg-gray-100 rounded-2xl border-gray-200 shadow-sm"
              onClick={() => handleNumberPress('0')}
            >
              0
            </Button>
            <Button
              variant="outline"
              className="h-14 bg-white hover:bg-gray-100 rounded-2xl border-gray-200 shadow-sm"
              onClick={handleBackspace}
            >
              <Delete className="h-5 w-5" />
            </Button>
          </div>

          {/* Confirm Button */}
          <Button
            className="w-full h-12 mt-3 text-base font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-2xl shadow-sm"
            onClick={handleConfirm}
            disabled={!isValid}
          >
            ОРУУЛАХ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
