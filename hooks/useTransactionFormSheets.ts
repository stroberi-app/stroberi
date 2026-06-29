import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
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

  const [isCurrencySheetMounted, setIsCurrencySheetMounted] = useState(false);
  const [isCategoriesSheetMounted, setIsCategoriesSheetMounted] = useState(false);
  const [isTripSheetMounted, setIsTripSheetMounted] = useState(false);
  const [pendingSheetToOpen, setPendingSheetToOpen] =
    useState<TransactionFormSheet | null>(null);

  const presentSheet = useCallback((sheetRef: RefObject<BottomSheetModal | null>) => {
    Keyboard.dismiss();
    InteractionManager.runAfterInteractions(() => {
      sheetRef.current?.present();
    });
  }, []);

  const requestSheetOpen = useCallback(
    (sheet: TransactionFormSheet) => {
      if (sheet === 'currency') {
        if (!isCurrencySheetMounted) {
          setIsCurrencySheetMounted(true);
          setPendingSheetToOpen('currency');
          return;
        }
        presentSheet(currencySheetRef);
        return;
      }

      if (sheet === 'categories') {
        if (!isCategoriesSheetMounted) {
          setIsCategoriesSheetMounted(true);
          setPendingSheetToOpen('categories');
          return;
        }
        presentSheet(categoriesSheetRef);
        return;
      }

      if (!isTripSheetMounted) {
        setIsTripSheetMounted(true);
        setPendingSheetToOpen('trip');
        return;
      }
      presentSheet(tripSheetRef);
    },
    [isCategoriesSheetMounted, isCurrencySheetMounted, isTripSheetMounted, presentSheet]
  );

  useEffect(() => {
    if (!pendingSheetToOpen) {
      return;
    }

    const mounted =
      (pendingSheetToOpen === 'currency' && isCurrencySheetMounted) ||
      (pendingSheetToOpen === 'categories' && isCategoriesSheetMounted) ||
      (pendingSheetToOpen === 'trip' && isTripSheetMounted);

    if (!mounted) {
      return;
    }

    const openSheet = () => {
      if (pendingSheetToOpen === 'currency') {
        presentSheet(currencySheetRef);
      } else if (pendingSheetToOpen === 'categories') {
        presentSheet(categoriesSheetRef);
      } else {
        presentSheet(tripSheetRef);
      }
      setPendingSheetToOpen(null);
    };

    const handle = requestAnimationFrame(openSheet);
    return () => cancelAnimationFrame(handle);
  }, [
    isCategoriesSheetMounted,
    isCurrencySheetMounted,
    isTripSheetMounted,
    pendingSheetToOpen,
    presentSheet,
  ]);

  return {
    currencySheetRef,
    categoriesSheetRef,
    tripSheetRef,
    isCurrencySheetMounted,
    isCategoriesSheetMounted,
    isTripSheetMounted,
    requestSheetOpen,
  };
};
