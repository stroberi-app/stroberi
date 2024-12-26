import React from 'react';
import { View, Input, Text, SizeTokens } from 'tamagui';
import { ChevronRight } from '@tamagui/lucide-icons';

type CurrencyInputProps = {
  size?: SizeTokens;
  focusOnMount?: boolean;
  labelText?: string;
  onChangeText?: (text: string) => void;
  onCurrencySelect: () => void;
  selectedCurrency: string;
  value: string;
};

export function CurrencyInput({
  focusOnMount = false,
  onChangeText,
  onCurrencySelect,
  selectedCurrency,
  value,
}: CurrencyInputProps) {
  const handleTextChange = (text: string) => {
    // Replace all commas with dots
    let newText = text.replace(/,/g, '.');

    // Allow only one dot
    const dotIndex = newText.indexOf('.');
    if (dotIndex !== -1) {
      newText = newText.slice(0, dotIndex + 1) + newText.slice(dotIndex + 1).replace(/\./g, '');
    }

    // Allow only valid numbers including negative numbers
    if (/^-?\d*\.?\d*$/.test(newText)) {
      onChangeText?.(newText);
    }
  };

  return (
    <View flexDirection="column" justifyContent="center" alignItems="center">
      <View
        width="100%"
        flexDirection="row"
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$gray5"
        borderRadius="$4">
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
          id="currencyInput"
          placeholder="00.00"
          autoFocus={focusOnMount}
          onChangeText={handleTextChange}
          value={value}
        />
        <View
          role="button"
          onPress={onCurrencySelect}
          aria-label={`Select currency. Current currency: ${selectedCurrency}`}
          borderColor="$borderColor"
          borderLeftWidth={2}
          paddingHorizontal="$2"
          backgroundColor="transparent"
          flexDirection="row"
          alignItems="center">
          <Text color="gray" fontSize="$8">
            {selectedCurrency}
          </Text>
          <ChevronRight size={24} color="gray" />
        </View>
      </View>
    </View>
  );
}
