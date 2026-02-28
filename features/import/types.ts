export type ImportRowFailure = {
  row: number;
  reason: string;
};

export type ImportResult = {
  importedCount: number;
  failed: ImportRowFailure[];
};
