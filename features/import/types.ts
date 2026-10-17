export type ImportRowFailure = {
  row: number;
  reason: string;
};

export type ImportResult = {
  importedCount: number;
  failed: ImportRowFailure[];
};

/** A user-facing import problem, rendered by ErrorSheet. */
export interface ErrorInfo {
  title: string;
  message: string;
  errors?: string[];
  type: 'file' | 'format' | 'validation' | 'import' | 'parse';
  showTemplateButton?: boolean;
  showRetryButton?: boolean;
}
