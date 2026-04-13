import { summarizeImportIssues } from './errorSummary';

describe('import error summary', () => {
  it('groups row issues, sorts rows, and keeps non-row issues separate', () => {
    const result = summarizeImportIssues([
      'Row 10: Amount must be a valid number',
      'Missing columns: merchant, amount',
      'Row 2: Currency code \'ABC\' is not supported',
      'Row 10: Date format is invalid (use YYYY-MM-DD)',
    ]);

    expect(result.totalIssues).toBe(4);
    expect(result.rowIssueCount).toBe(3);
    expect(result.rows).toEqual([
      {
        rowNumber: 2,
        messages: ["Currency code 'ABC' is not supported"],
      },
      {
        rowNumber: 10,
        messages: [
          'Amount must be a valid number',
          'Date format is invalid (use YYYY-MM-DD)',
        ],
      },
    ]);
    expect(result.generalIssues).toEqual(['Missing columns: merchant, amount']);
  });

  it('deduplicates identical row messages and trims whitespace', () => {
    const result = summarizeImportIssues([
      '  Row 3: Missing required fields: amount, date, currency ',
      'Row 3: Missing required fields: amount, date, currency',
      '  ',
    ]);

    expect(result.totalIssues).toBe(2);
    expect(result.rows).toEqual([
      {
        rowNumber: 3,
        messages: ['Missing required fields: amount, date, currency'],
      },
    ]);
    expect(result.generalIssues).toEqual([]);
  });
});
