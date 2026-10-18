import type { CreateTransactionPayload } from '../../database/actions/transactions';
import {
  type CSVRow,
  normalizeCurrencyCode,
  parseImportDate,
  validateCSVRow,
} from './validation';

export type PreparedImportTransaction = Omit<
  CreateTransactionPayload,
  'categoryId' | 'allowMissingRate'
> & {
  categoryName: string | null;
};

export type PreparedImportData = {
  preparedTransactions: PreparedImportTransaction[];
  categoriesToCreate: Map<string, { name: string; icon: string }>;
  errors: string[];
};

export const prepareImportRows = ({
  rows,
  supportedCurrencyCodes,
  existingCategoryNames,
  baseCurrency,
}: {
  rows: CSVRow[];
  supportedCurrencyCodes: string[];
  existingCategoryNames: Set<string>;
  baseCurrency: string;
}): PreparedImportData => {
  const preparedTransactions: PreparedImportTransaction[] = [];
  const categoriesToCreate = new Map<string, { name: string; icon: string }>();
  const errors: string[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];

    if (!row || typeof row !== 'object') {
      errors.push(`Row ${index + 1}: Invalid data format`);
      continue;
    }

    const validationErrors = validateCSVRow(row, index, supportedCurrencyCodes);
    if (validationErrors.length > 0) {
      errors.push(...validationErrors);
      continue;
    }

    const { merchant, amount, date, note, currencyCode, category, categoryIcon } = row;
    const parsedDate = parseImportDate(date);
    if (!parsedDate) {
      continue;
    }

    const normalizedMerchant = merchant?.trim() ?? '';
    const rawCategoryName = category?.trim() ?? '';
    const normalizedCategoryName = rawCategoryName.toLowerCase() || null;

    if (
      normalizedCategoryName &&
      categoryIcon &&
      !existingCategoryNames.has(normalizedCategoryName) &&
      !categoriesToCreate.has(normalizedCategoryName)
    ) {
      categoriesToCreate.set(normalizedCategoryName, {
        name: rawCategoryName,
        icon: categoryIcon,
      });
    }

    preparedTransactions.push({
      merchant: normalizedMerchant,
      amount: Number(amount),
      date: parsedDate,
      note: note?.trim() || '',
      currencyCode: normalizeCurrencyCode(currencyCode),
      categoryName: normalizedCategoryName,
      baseCurrency,
      sourceRowNumber: index + 1,
    });
  }

  return {
    preparedTransactions,
    categoriesToCreate,
    errors,
  };
};

export const buildImportTransactionPayloads = ({
  preparedTransactions,
  categoryIdsByName,
}: {
  preparedTransactions: PreparedImportTransaction[];
  categoryIdsByName: Map<string, string>;
}): CreateTransactionPayload[] => {
  return preparedTransactions.map((transaction) => {
    const categoryId = transaction.categoryName
      ? (categoryIdsByName.get(transaction.categoryName) ?? null)
      : null;

    return {
      merchant: transaction.merchant,
      amount: transaction.amount,
      date: transaction.date,
      note: transaction.note,
      currencyCode: transaction.currencyCode,
      categoryId,
      baseCurrency: transaction.baseCurrency,
      sourceRowNumber: transaction.sourceRowNumber,
    };
  });
};
