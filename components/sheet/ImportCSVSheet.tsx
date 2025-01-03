import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { CustomBackdrop } from '../CustomBackdrop';
import { Spinner, Text, View, YStack } from 'tamagui';
import { Button } from '../button/Button';
import { FolderInput } from '@tamagui/lucide-icons';
import { backgroundStyle, handleIndicatorStyle } from './constants';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Papa from 'papaparse';
import {
  createCategory,
  createTransaction,
  CreateTransactionPayload,
} from '../../database/helpers';
import { currencies } from '../../data/currencies';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { CategoryModel } from '../../database/category-model';
import useToast from '../../hooks/useToast';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';

interface CSVRow {
  merchant: string;
  amount: string;
  date: string;
  note?: string;
  currencyCode: string;
  category?: string;
  categoryIcon?: string;
}

type ImportCSVSheetProps = {
  sheetRef: React.RefObject<BottomSheetModal>;
};

const snapPoints = ['50%'];
export const ImportCSVSheet = ({ sheetRef }: ImportCSVSheetProps) => {
  const toast = useToast();
  const { bottom } = useSafeAreaInsets();
  const [importing, setImporting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { defaultCurrency } = useDefaultCurrency();
  const database = useDatabase();
  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'text/csv' });
      if (res.assets?.[0].uri) {
        const content = await FileSystem.readAsStringAsync(res.assets?.[0].uri);
        Papa.parse<CSVRow>(content, {
          header: true,
          skipEmptyLines: true,
          complete: async results => {
            const categories = await database.get<CategoryModel>('categories').query().fetch();
            if (results.data.length === 0) {
              console.log('No data found in the CSV file');
              setImporting(false);
              return;
            }

            const requiredColumns = ['merchant', 'amount', 'date', 'currencyCode'];
            const missingColumns = requiredColumns.filter(
              col => !results.meta.fields?.includes(col)
            );

            if (missingColumns.length > 0) {
              console.log(`Missing required columns: ${missingColumns.join(', ')}`);
              setImporting(false);
              toast.alert({
                title: 'Failed to import.',
                preset: 'error',
                message: `Missing required columns: ${missingColumns.join(', ')}`,
              });
              return;
            }

            const validTransactions: CreateTransactionPayload[] = [];
            const errors: string[] = [];

            for (let index = 0; index < results.data.length; index++) {
              const row = results.data[index];
              if (
                row &&
                typeof row === 'object' &&
                (!('merchant' in row) ||
                  !('amount' in row) ||
                  !('date' in row) ||
                  !('currencyCode' in row))
              ) {
                errors.push(`Row ${index + 1}: Missing required fields`);
              }
              const { merchant, amount, date, note, currencyCode, category, categoryIcon } = row;

              if (!amount || !date || !currencyCode) {
                errors.push(`Row ${index + 1}: Missing required fields`);
              }

              if (isNaN(Number(amount))) {
                errors.push(`Row ${index + 1}: Amount should be a number`);
              }

              const parsedDate = new Date(date);
              if (isNaN(parsedDate.getTime())) {
                errors.push(`Row ${index + 1}: Invalid date format`);
              }
              // valid currency code
              if (!currencies.some(currency => currency.code === currencyCode)) {
                errors.push(`Row ${index + 1}: Invalid currency code`);
              }

              let matchedCategory = categories.find(cat => cat.name === category);

              if (!matchedCategory && category && categoryIcon && !errors.length) {
                matchedCategory = await createCategory({
                  name: category,
                  icon: categoryIcon,
                });
              }
              validTransactions.push({
                merchant,
                amount: Number(amount),
                date: parsedDate,
                note: note || '',
                currencyCode,
                categoryId: matchedCategory?.id ?? null,
                baseCurrency: defaultCurrency as string,
              });
            }

            if (errors.length > 0) {
              toast.alert({
                title: 'Failed to import.',
                preset: 'error',
                message: errors.join('\n'),
              });
              setImporting(false);
              return;
            }

            for (const transaction of validTransactions) {
              await createTransaction(transaction);
            }

            if (validTransactions.length > 0) {
              toast.show({
                title: 'Success',
                message: `Imported ${validTransactions.length} ${
                  validTransactions.length === 1 ? 'transaction' : 'transactions'
                }`,
                preset: 'custom',
                duration: 2,
              });
            } else {
              toast.show({
                title: 'Error',
                message: `No transactions found in the CSV file`,
                preset: 'error',
                duration: 2,
              });
            }

            // showToast(validTransactions.length);
            sheetRef.current?.dismiss();
          },
        });
      }
    } catch (e) {
      console.error(e);
    }
    setImporting(false);
  };

  const handleDownloadCSVFileTemplate = async () => {
    setDownloading(true);
    try {
      const template = `merchant,amount,date,note,currencyCode,category,categoryIcon`;
      const uri = FileSystem.cacheDirectory + 'template.csv';
      await FileSystem.writeAsStringAsync(uri, template);
      await Sharing.shareAsync(uri);
    } catch (e) {
      console.error(e);
    }
    setDownloading(false);
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
            Import Transactions from CSV file
          </Text>
        </View>
        <Text>
          Make sure your CSV file is in the correct format. You can download an example CSV file
          bellow.
        </Text>
        <YStack gap={'$4'} mt={'auto'}>
          <Button
            fontWeight={'bold'}
            backgroundColor={'#0f396e'}
            onPress={() => handleDownloadCSVFileTemplate()}
            disabled={importing}>
            Download CSV file template
            {downloading ? <Spinner color={'white'} /> : null}
          </Button>
          <Button
            fontWeight={'bold'}
            backgroundColor={'$green'}
            mt={'auto'}
            onPress={() => handleImport()}
            disabled={importing}>
            Import
            {importing ? <Spinner color={'white'} /> : <FolderInput size={18} color={'white'} />}
          </Button>
        </YStack>
      </View>
    </BottomSheetModal>
  );
};
