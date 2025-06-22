import {
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetView,
  TouchableOpacity,
} from '@gorhom/bottom-sheet';
import React, { useCallback, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input, View } from 'tamagui';
import { type Currency, currencies } from '../data/currencies';
import { ListItem } from './ListItem';
import { backgroundStyle, handleIndicatorStyle, snapPoints } from './sheet/constants';

type CurrencySelectProps = {
  selectedCurrency: string;
  onSelect: (currency: Currency) => void;
  sheetRef: React.RefObject<BottomSheetModal>;
};

export const CurrencySelect = ({
  selectedCurrency,
  onSelect,
  sheetRef,
}: CurrencySelectProps) => {
  const renderItem = useCallback(
    ({ item: currency }: { item: Currency }) => (
      <React.Fragment key={currency.code}>
        <TouchableOpacity
          onPress={() => {
            onSelect(currency);
          }}
        >
          <ListItem
            name={currency.name}
            extra={currency.code}
            selected={currency.code === selectedCurrency}
          />
        </TouchableOpacity>
      </React.Fragment>
    ),
    [selectedCurrency, onSelect]
  );

  const [search, setSearch] = useState('');

  const filteredData = useMemo(
    () =>
      currencies
        .filter(
          (currency) =>
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
      backgroundStyle={backgroundStyle}
    >
      <BottomSheetView>
        <View padding="$2">
          <Input
            placeholder="Search currencies"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <BottomSheetFlatList
          data={filteredData}
          keyExtractor={(i) => i.code}
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
