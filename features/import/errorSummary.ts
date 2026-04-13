const ROW_ISSUE_REGEX = /^Row\s+(\d+)\s*:\s*(.+)$/i;

export type RowIssueGroup = {
  rowNumber: number;
  messages: string[];
};

export type ImportIssueSummary = {
  totalIssues: number;
  rowIssueCount: number;
  rows: RowIssueGroup[];
  generalIssues: string[];
};

export const summarizeImportIssues = (issues: string[]): ImportIssueSummary => {
  const rowsByNumber = new Map<number, Set<string>>();
  const generalIssues: string[] = [];
  let totalIssues = 0;
  let rowIssueCount = 0;

  for (const rawIssue of issues) {
    const issue = rawIssue.trim();
    if (!issue) {
      continue;
    }

    totalIssues += 1;
    const rowMatch = issue.match(ROW_ISSUE_REGEX);

    if (!rowMatch) {
      generalIssues.push(issue);
      continue;
    }

    const rowNumber = Number(rowMatch[1]);
    const message = rowMatch[2].trim();

    if (Number.isNaN(rowNumber) || !message) {
      generalIssues.push(issue);
      continue;
    }

    const rowIssues = rowsByNumber.get(rowNumber) ?? new Set<string>();
    const previousSize = rowIssues.size;
    rowIssues.add(message);

    if (rowIssues.size > previousSize) {
      rowIssueCount += 1;
    }

    rowsByNumber.set(rowNumber, rowIssues);
  }

  const rows: RowIssueGroup[] = Array.from(rowsByNumber.entries())
    .sort(([left], [right]) => left - right)
    .map(([rowNumber, messages]) => ({
      rowNumber,
      messages: Array.from(messages.values()),
    }));

  return {
    totalIssues,
    rowIssueCount,
    rows,
    generalIssues,
  };
};
