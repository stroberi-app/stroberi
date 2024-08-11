import React, { useCallback, useMemo, useState } from 'react';
import {
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetView,
  TouchableOpacity,
} from '@gorhom/bottom-sheet';
import { currencies, Currency } from '../data/currencies';
import { CurrencyItem } from './CurrencyItem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { backgroundStyle, handleIndicatorStyle, snapPoints } from './sheet/constants';
import { Input, View } from 'tamagui';

type CurrencySelectProps = {
  sheetRef: React.RefObject<BottomSheetModal>;
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
};
export const CurrencySelect = ({
  sheetRef,
  selectedCurrency,
  setSelectedCurrency,
}: CurrencySelectProps) => {
  const renderItem = useCallback(
    ({ item: currency }: { item: Currency }) => (
      <React.Fragment key={currency.code}>
        <TouchableOpacity
          onPress={() => {
            setSelectedCurrency(currency.code);
            sheetRef.current?.close();
          }}>
          <CurrencyItem
            name={currency.name}
            code={currency.code}
            selected={currency.code === selectedCurrency}
          />
        </TouchableOpacity>
      </React.Fragment>
    ),
    [selectedCurrency]
  );

  const [search, setSearch] = useState('');
  const filteredData = useMemo(
    () =>
      currencies
        .filter(
          currency =>
            currency.name.toLowerCase().includes(search.toLowerCase()) ||
            currency.code.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => {
          if (a.code === selectedCurrency) {
            return -1;
          }
          if (b.code === selectedCurrency) {
            return 1;
          }
          return 0;
        }),
    [search, selectedCurrency]
  );
  const { bottom } = useSafeAreaInsets();
  return (
    <BottomSheetModal
      enableContentPanningGesture={false}
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      enableDynamicSizing={false}
      animateOnMount={true}
      handleIndicatorStyle={handleIndicatorStyle}
      backgroundStyle={backgroundStyle}>
      <BottomSheetView>
        <View padding={'$2'}>
          <Input placeholder="Search currencies" value={search} onChangeText={setSearch} />
        </View>
        <BottomSheetFlatList
          data={filteredData}
          keyExtractor={i => i.code}
          renderItem={renderItem}
          contentInset={{
            bottom,
          }}
          style={{
            marginBottom: bottom,
          }}
        />
      </BottomSheetView>
    </BottomSheetModal>
  );
};
