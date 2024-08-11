import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { CustomBackdrop } from '../CustomBackdrop';
import { Separator, Spinner, Text, View, YStack } from 'tamagui';
import { Button } from '../button/Button';
import { FolderOutput } from '@tamagui/lucide-icons';
import { backgroundStyle, handleIndicatorStyle, snapPoints } from './constants';
import { DatePicker } from '../DatePicker';
import { CheckboxWithLabel } from '../checkbox/CheckBoxWithLabel';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { TransactionModel } from '../../database/transaction-model';
import { Q } from '@nozbe/watermelondb';
import Papa from 'papaparse';
import dayjs from 'dayjs';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

type ExportCSVSheetProps = {
  sheetRef: React.RefObject<BottomSheetModal>;
};

export const ExportCSVSheet = ({ sheetRef }: ExportCSVSheetProps) => {
  const { bottom } = useSafeAreaInsets();

  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());

  const [includedColumns, setIncludedColumns] = useState([
    { name: 'merchant', checked: true, label: 'Merchant/Vendor' },
    { name: 'amount', checked: true, label: 'Amount' },
    { name: 'date', checked: true, label: 'Date' },
    { name: 'note', checked: true, label: 'Note' },
    { name: 'currencyCode', checked: true, label: 'Currency' },
    { name: 'location', checked: false, label: 'Location' },
    { name: 'category', checked: false, label: 'Category' },
  ]);
  const [loading, setLoading] = useState(false);

  const database = useDatabase();
  const handleExport = async () => {
    setLoading(true);
    const transactions = await database.collections
      .get<TransactionModel>('transactions')
      .query(
        Q.where('date', Q.gte(dayjs(fromDate).startOf('day').toDate().getTime())),
        Q.where('date', Q.lte(dayjs(toDate).endOf('day').toDate().getTime()))
      )
      .fetch();

    console.log({ transactions });
    const csv = Papa.unparse(
      transactions.map(transaction => {
        const tx: Partial<Record<keyof TransactionModel, unknown>> = {};
        includedColumns.forEach(column => {
          if (column.checked) {
            const key = column.name as keyof TransactionModel;
            tx[key] = transaction[key];
          }
        });
        return tx;
      })
    );
    const path = FileSystem.documentDirectory + `stoberi_export_${new Date().toISOString()}.csv`;
    await FileSystem.writeAsStringAsync(path, csv);
    await Sharing.shareAsync(path);

    setLoading(false);
  };
  return (
    <BottomSheetModal
      ref={sheetRef}
      enableContentPanningGesture={false}
      snapPoints={snapPoints}
      stackBehavior="push"
      enableDynamicSizing={false}
      enablePanDownToClose={true}
      animateOnMount={true}
      backdropComponent={CustomBackdrop}
      handleIndicatorStyle={handleIndicatorStyle}
      backgroundStyle={backgroundStyle}>
      <View padding={'$4'} gap={'$2'} pb={bottom + 16} height={'100%'}>
        <View flexDirection={'row'} justifyContent={'space-between'} alignItems={'center'}>
          <Text fontSize={'$6'} fontWeight={'bold'}>
            From Date
          </Text>
          <DatePicker date={fromDate} setDate={setFromDate} />
        </View>

        <View flexDirection={'row'} justifyContent={'space-between'} alignItems={'center'}>
          <Text fontSize={'$6'} fontWeight={'bold'}>
            To Date
          </Text>
          <DatePicker date={toDate} setDate={setToDate} />
        </View>
        <Separator marginVertical={15} />
        <Text>Include fields</Text>
        <YStack>
          {includedColumns.map((column, index) => (
            <CheckboxWithLabel
              key={index}
              size="$4"
              defaultChecked={column.checked}
              label={column.label}
              name={column.name}
              checked={column.checked}
              onCheckedChange={checked => {
                setIncludedColumns(
                  includedColumns.map(c =>
                    c.name === column.name ? { ...c, checked: !!checked } : c
                  )
                );
              }}
            />
          ))}
        </YStack>
        <Button
          fontWeight={'bold'}
          backgroundColor={'$green'}
          mt={'auto'}
          onPress={() => handleExport()}
          disabled={loading}>
          Export{' '}
          {loading ? <Spinner color={'white'} /> : <FolderOutput size={18} color={'white'} />}
        </Button>
      </View>
    </BottomSheetModal>
  );
};
