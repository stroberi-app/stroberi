import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager, Keyboard } from 'react-native';

export type TransactionFormSheet = 'currency' | 'categories' | 'trip';

/**
 * Manages the create-transaction screen's bottom sheets. Each sheet is mounted
 * lazily on first request; once mounted, requests present it directly. The
 * deferred-open effect bridges the gap between "just mounted" and "ready to
 * present" so the very first open still animates correctly.
 */
export const useTransactionFormSheets = () => {
  const currencySheetRef = useRef<BottomSheetModal | null>(null);
  const categoriesSheetRef = useRef<BottomSheetModal | null>(null);
  const tripSheetRef = useRef<BottomSheetModal | null>(null);

  const [mountedSheets, setMountedSheets] = useState<ReadonlySet<TransactionFormSheet>>(
    () => new Set()
  );
  const [pendingSheet, setPendingSheet] = useState<TransactionFormSheet | null>(null);

  const presentSheet = useCallback((sheet: TransactionFormSheet) => {
    const sheetRef = {
      currency: currencySheetRef,
      categories: categoriesSheetRef,
      trip: tripSheetRef,
    }[sheet];

    Keyboard.dismiss();
    InteractionManager.runAfterInteractions(() => {
      sheetRef.current?.present();
    });
  }, []);

  const requestSheetOpen = useCallback(
    (sheet: TransactionFormSheet) => {
      if (mountedSheets.has(sheet)) {
        presentSheet(sheet);
        return;
      }

      setMountedSheets((current) => new Set(current).add(sheet));
      setPendingSheet(sheet);
    },
    [mountedSheets, presentSheet]
  );

  useEffect(() => {
    if (!pendingSheet || !mountedSheets.has(pendingSheet)) {
      return;
    }

    const handle = requestAnimationFrame(() => {
      presentSheet(pendingSheet);
      setPendingSheet(null);
    });
    return () => cancelAnimationFrame(handle);
  }, [mountedSheets, pendingSheet, presentSheet]);

  return {
    currencySheetRef,
    categoriesSheetRef,
    tripSheetRef,
    isCurrencySheetMounted: mountedSheets.has('currency'),
    isCategoriesSheetMounted: mountedSheets.has('categories'),
    isTripSheetMounted: mountedSheets.has('trip'),
    requestSheetOpen,
  };
};
