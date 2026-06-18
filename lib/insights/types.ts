export type InsightTransactionType = 'expense' | 'income';

export type InsightTransaction = {
  id: string;
  amountInBaseCurrency: number;
  date: Date;
  categoryId: string | null;
  merchant: string;
  type: InsightTransactionType;
};

export type InsightCategory = {
  id: string;
  name: string;
  icon?: string;
};

export type InsightPeriod = {
  fromDate: Date;
  toDate: Date;
  comparisonToDate: Date;
};

export type InsightConfidence = 'low' | 'medium' | 'high';

export type InsightSeverity = 'positive' | 'neutral' | 'warning' | 'critical';

export type SafeToSpendStatus = 'safe' | 'caution' | 'danger' | 'unknown';

export type SafeToSpendSummary = {
  dailyAmount: number;
  remainingAmount: number;
  periodStart: Date;
  periodEnd: Date;
  daysLeft: number;
  status: SafeToSpendStatus;
  confidence: InsightConfidence;
  explanation: string;
  inputs: {
    incomeSoFar: number;
    spentSoFar: number;
    expectedRecurring: number;
    budgetLimit?: number;
    historicalMonthlyAverage?: number;
    availableMonthlyAmount?: number;
  };
};

export type MonthForecast = {
  currentSpend: number;
  projectedSpend: number;
  budgetLimit?: number;
  daysElapsed: number;
  daysInPeriod: number;
  status: SafeToSpendStatus;
  confidence: InsightConfidence;
  explanation: string;
};

export type InsightAction =
  | { type: 'viewTransactions'; label: string; categoryId?: string; merchant?: string }
  | { type: 'createBudget'; label: string; categoryId?: string }
  | { type: 'fixCategories'; label: string }
  | { type: 'none'; label: string };

export type MoneyInsightType =
  | 'spendingPace'
  | 'categorySpike'
  | 'smallPurchases'
  | 'budgetRisk'
  | 'positiveTrend'
  | 'dataQuality'
  | 'forecastWarning';

export type MoneyInsight = {
  id: string;
  type: MoneyInsightType;
  title: string;
  body: string;
  severity: InsightSeverity;
  confidence: InsightConfidence;
  priority: number;
  amount?: number;
  categoryId?: string;
  merchant?: string;
  evidence: {
    current?: number;
    baseline?: number;
    changePercent?: number;
    transactionIds?: string[];
  };
  actions: InsightAction[];
};

export type RecapItem = {
  label: string;
  amount: number;
  changeAmount: number;
  categoryId?: string;
};

export type WeeklyRecap = {
  totalSpent: number;
  previousWeekSpent: number;
  changeAmount: number;
  changePercent: number;
  bestImprovement?: RecapItem;
  biggestIncrease?: RecapItem;
  oneThingToWatch?: RecapItem;
  summary: string;
};

export type SpendingLeak = {
  id: string;
  type: 'tinyPurchases';
  title: string;
  monthlyImpact: number;
  confidence: InsightConfidence;
  transactions: string[];
  action?: InsightAction;
};

export type DataQualitySummary = {
  uncategorizedCount: number;
  uncategorizedAmount: number;
  transactionCount: number;
  confidence: InsightConfidence;
};

export type InsightsOverview = {
  safeToSpend: SafeToSpendSummary;
  forecast: MonthForecast;
  weeklyRecap: WeeklyRecap;
  insights: MoneyInsight[];
  spendingLeaks: SpendingLeak[];
  dataQuality: DataQualitySummary;
};
