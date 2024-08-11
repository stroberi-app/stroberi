import { SizeTokens, Text } from 'tamagui';
import { View, Input } from 'tamagui';
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
  return (
    <View flexDirection="column" justifyContent="center" alignItems="center">
      <View
        width={'100%'}
        flexDirection={'row'}
        borderWidth={1}
        borderColor={'$borderColor'}
        backgroundColor={'$gray5'}
        borderRadius={'$4'}>
        <Input
          borderRadius={'$0'}
          backgroundColor={'transparent'}
          borderWidth={0}
          keyboardType={'numeric'}
          style={{
            height: 64,
            fontSize: 32,
            // backgroundColor: 'red',
            flex: 1,
          }}
          id="currencyInput"
          placeholder="00.00"
          autoFocus={focusOnMount}
          onChangeText={onChangeText}
          value={value}
        />
        <View
          onTouchStart={() => onCurrencySelect()}
          // onTouchStart={() => router.push('/select-currency')}
          // borderWidth={1}
          // borderRadius={'$4'}
          borderColor={'$borderColor'}
          borderLeftWidth={2}
          paddingHorizontal={'$2'}
          backgroundColor={'transparent'}
          flexDirection={'row'}
          alignItems={'center'}>
          <Text color={'gray'} fontSize={'$8'}>
            {selectedCurrency}
          </Text>
          <ChevronRight size={24} color={'gray'} />
        </View>
      </View>
    </View>
  );
}
