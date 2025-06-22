import { ChevronRight } from '@tamagui/lucide-icons';
import { useCallback, useMemo } from 'react';
import { Input, type SizeTokens, Text, View } from 'tamagui';

type CurrencyInputProps = {
  size?: SizeTokens;
  focusOnMount?: boolean;
  labelText?: string;
  onChangeText?: (text: string) => void;
  onCurrencySelect: () => void;
  selectedCurrency: string;
  value: string;
  maxValue?: number;
  allowNegative?: boolean;
  decimalPlaces?: number;
  onValidationError?: (error: string) => void;
};

export function CurrencyInput({
  focusOnMount = false,
  onChangeText,
  onCurrencySelect,
  selectedCurrency,
  value,
  maxValue = 999999999,
  allowNegative = true,
  decimalPlaces = 2,
  onValidationError,
}: CurrencyInputProps) {
  const validationResult = useMemo(() => {
    if (!value) return { isValid: true, error: null };

    if (value === '-' && allowNegative) {
      return { isValid: true, error: null };
    }

    const numValue = Number(value);

    if (Number.isNaN(numValue)) {
      return { isValid: false, error: 'Invalid number format' };
    }

    if (!allowNegative && numValue < 0) {
      return { isValid: false, error: 'Negative values not allowed' };
    }

    if (Math.abs(numValue) > maxValue) {
      return {
        isValid: false,
        error: `Amount cannot exceed ${maxValue.toLocaleString()}`,
      };
    }

    return { isValid: true, error: null };
  }, [value, allowNegative, maxValue]);

  const handleTextChange = useCallback(
    (text: string) => {
      if (text === '' || text === '-') {
        onChangeText?.(text);
        return;
      }

      let processedText = text.replace(/,/g, '.');

      const isNegative = processedText.startsWith('-');
      if (isNegative && !allowNegative) {
        onValidationError?.('Negative values are not allowed');
        return;
      }

      if (isNegative) {
        processedText = processedText.slice(1);
      }

      processedText = processedText.replace(/[^0-9.]/g, '');

      const dotIndex = processedText.indexOf('.');
      if (dotIndex !== -1) {
        const beforeDot = processedText.slice(0, dotIndex);
        const afterDot = processedText.slice(dotIndex + 1).replace(/\./g, '');
        processedText = `${beforeDot}.${afterDot}`;
      }

      if (dotIndex !== -1 && processedText.length > dotIndex + 1 + decimalPlaces) {
        processedText = processedText.slice(0, dotIndex + 1 + decimalPlaces);
      }

      if (
        processedText.length > 1 &&
        processedText[0] === '0' &&
        processedText[1] !== '.'
      ) {
        processedText = processedText.slice(1);
      }

      const finalText = isNegative ? `-${processedText}` : processedText;

      if (finalText && !/^-?\d*\.?\d*$/.test(finalText)) {
        onValidationError?.('Invalid number format');
        return;
      }

      const numValue = Number(finalText);
      if (!Number.isNaN(numValue) && Math.abs(numValue) > maxValue) {
        onValidationError?.(`Amount cannot exceed ${maxValue.toLocaleString()}`);
        return;
      }

      if (finalText === '.' || finalText === '-.' || finalText.endsWith('..')) {
        return;
      }

      onChangeText?.(finalText);
    },
    [allowNegative, decimalPlaces, maxValue, onChangeText, onValidationError]
  );

  return (
    <View flexDirection="column" justifyContent="center" alignItems="center">
      <View
        width="100%"
        flexDirection="row"
        borderWidth={1}
        borderColor={validationResult.isValid ? '$borderColor' : '$red10'}
        backgroundColor="$gray5"
        borderRadius="$4"
      >
        <Input
          borderRadius="$0"
          backgroundColor="transparent"
          borderWidth={0}
          keyboardType="numeric"
          style={{
            height: 64,
            fontSize: 32,
            flex: 1,
          }}
          id={`currencyInput-${Math.random()}`}
          placeholder="0.00"
          autoFocus={focusOnMount}
          onChangeText={handleTextChange}
          value={value}
          accessibilityLabel={`Amount input in ${selectedCurrency}. Current value: ${value || 'empty'}`}
          accessibilityHint={`Enter an amount${!allowNegative ? '. Negative values not allowed' : ''}. Maximum ${decimalPlaces} decimal places.`}
        />
        <View
          role="button"
          onPress={onCurrencySelect}
          accessibilityRole="button"
          accessibilityLabel={`Select currency. Current currency: ${selectedCurrency}`}
          accessibilityHint="Tap to choose a different currency"
          borderColor="$borderColor"
          borderLeftWidth={2}
          paddingHorizontal="$2"
          backgroundColor="transparent"
          flexDirection="row"
          alignItems="center"
        >
          <Text color="gray" fontSize="$8">
            {selectedCurrency}
          </Text>
          <ChevronRight size={24} color="gray" />
        </View>
      </View>

      {!validationResult.isValid && validationResult.error && (
        <View
          width="100%"
          marginTop="$1"
          paddingHorizontal="$2"
          accessibilityRole="alert"
        >
          <Text
            color="$red10"
            fontSize="$3"
            textAlign="left"
            accessibilityLabel={`Input error: ${validationResult.error}`}
          >
            {validationResult.error}
          </Text>
        </View>
      )}
    </View>
  );
}
