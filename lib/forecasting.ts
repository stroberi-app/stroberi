import dayjs from 'dayjs';
import type { TransactionModel } from '../database/transaction-model';
import { formatCurrency } from './format';
import { calculateCategoryTrends } from './advancedAnalytics';

// ============================================================================
// Types
// ============================================================================

export interface SpendingForecast {
    currentSpend: number;
    projectedSpend: number;
    daysRemaining: number;
    dailyAverage: number;
    status: 'on-track' | 'warning' | 'critical';
    confidence: 'high' | 'medium' | 'low'; // Based on how far into the month we are
}

export interface RecurringTransaction {
    merchant: string;
    amount: number;
    frequency: 'monthly' | 'weekly';
    predictedDate: Date;
    confidence: number;
    lastDate: Date;
}

export interface SmartInsight {
    id: string;
    type: 'forecast' | 'recurring' | 'anomaly' | 'tip';
    title: string;
    message: string;
    icon: string;
    color: string;
    action?: string;
    priority: number; // Higher is more important
}

// ============================================================================
// Logic
// ============================================================================

/**
 * Project end-of-month spending based on current velocity
 */
export function calculateProjectedSpending(
    transactions: TransactionModel[],
    budgetLimit?: number
): SpendingForecast {
    const today = dayjs();
    const startOfMonth = today.startOf('month');
    const endOfMonth = today.endOf('month');
    const totalDays = endOfMonth.diff(startOfMonth, 'day') + 1;
    const daysPassed = Math.max(1, today.diff(startOfMonth, 'day') + 1);
    const daysRemaining = totalDays - daysPassed;

    // Calculate current month's expenses
    const currentMonthExpenses = transactions
        .filter((tx) => {
            const txDate = dayjs(tx.date);
            return (
                txDate.isAfter(startOfMonth.subtract(1, 'day')) &&
                txDate.isBefore(endOfMonth.add(1, 'day')) &&
                tx.amountInBaseCurrency < 0
            );
        })
        .reduce((sum, tx) => sum + Math.abs(tx.amountInBaseCurrency), 0);

    // Simple linear projection: Average daily spend * Total days
    // We weight recent days slightly more? For now, straight average
    const dailyAverage = currentMonthExpenses / daysPassed;
    const projectedSpend = currentMonthExpenses + dailyAverage * daysRemaining;

    // Adjust for known recurring expenses that haven't happened yet?
    // (Future enhancement - for now keep simple)

    let status: 'on-track' | 'warning' | 'critical' = 'on-track';
    if (budgetLimit) {
        if (projectedSpend > budgetLimit) status = 'critical';
        else if (projectedSpend > budgetLimit * 0.9) status = 'warning';
    }

    // Confidence increases as the month progresses
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (daysPassed > 20) confidence = 'high';
    else if (daysPassed > 10) confidence = 'medium';

    return {
        currentSpend: currentMonthExpenses,
        projectedSpend,
        daysRemaining,
        dailyAverage,
        status,
        confidence,
    };
}

/**
 * Detect recurring transactions (subscriptions, bills)
 * Looks for transactions with similar amounts (+-5%) on similar days of month
 */
export function detectRecurringTransactions(
    transactions: TransactionModel[]
): RecurringTransaction[] {
    // Group by merchant first
    const byMerchant: Record<string, TransactionModel[]> = {};

    // Filter for expenses in last 3 months
    const threeMonthsAgo = dayjs().subtract(3, 'month').toDate();

    transactions
        .filter((tx) => tx.amountInBaseCurrency < 0 && new Date(tx.date) >= threeMonthsAgo)
        .forEach((tx) => {
            const merchant = tx.merchant || 'Uncategorized';
            if (!byMerchant[merchant]) byMerchant[merchant] = [];
            byMerchant[merchant].push(tx);
        });

    const recurring: RecurringTransaction[] = [];

    Object.entries(byMerchant).forEach(([merchant, txs]) => {
        if (txs.length < 2) return;

        // Check for amount consistency
        // Simple heuristic: if most recent transaction matches previous one within small margin
        const sortedTxs = txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const recent = sortedTxs[0];
        const previous = sortedTxs[1];

        // Amount similarity check (within 2%)
        const amt1 = Math.abs(recent.amountInBaseCurrency);
        const amt2 = Math.abs(previous.amountInBaseCurrency);
        const amountMatch = Math.abs(amt1 - amt2) / amt1 < 0.05;

        // Date similarity (monthly)
        const date1 = dayjs(recent.date);
        const date2 = dayjs(previous.date);
        const daysDiff = date1.diff(date2, 'day');
        const isMonthly = Math.abs(daysDiff - 30) < 5; // roughly 30 days apart

        if (amountMatch && isMonthly) {
            recurring.push({
                merchant,
                amount: amt1,
                frequency: 'monthly',
                predictedDate: date1.add(1, 'month').toDate(),
                confidence: 0.8,
                lastDate: recent.date,
            });
        }
    });

    return recurring;
}

/**
 * Generate smart user-facing insights
 */
export function generateSmartInsights(
    transactions: TransactionModel[],
    currency: string = 'USD',
    categories: Array<{ id: string; name: string }> = []
): SmartInsight[] {
    const insights: SmartInsight[] = [];
    const forecast = calculateProjectedSpending(transactions);

    // 1. Spending Forecast Insight
    if (forecast.daysRemaining > 0 && forecast.projectedSpend > forecast.currentSpend * 1.1) {
        insights.push({
            id: 'forecast-main',
            type: 'forecast',
            title: 'Spending Check',
            message: `On track to spend ${formatCurrency(forecast.projectedSpend, currency)} by month end.`,
            icon: 'TrendingUp',
            color: '$stroberi',
            priority: 10,
        });
    }

    // 2. Unusual Spending (Anomalies)
    if (categories.length > 0) {
        const today = new Date();
        const startOfMonth = dayjs().startOf('month').toDate();
        const endOfMonth = dayjs().endOf('month').toDate();

        // We reuse the existing advanced analytics function
        const trends = calculateCategoryTrends(transactions, startOfMonth, endOfMonth, categories);

        trends.unusualSpending.forEach(anomaly => {
            insights.push({
                id: `anomaly-${anomaly.categoryId}`,
                type: 'anomaly',
                title: 'Unusual Spending',
                message: `${anomaly.categoryName} is ${Math.round(anomaly.percentageAbove)}% higher than your average.`,
                icon: 'AlertTriangle',
                color: '$orange10',
                priority: 9,
            });
        });
    }

    // 3. Upcoming Recurring Bills
    const recurring = detectRecurringTransactions(transactions);
    const nextUp = recurring
        .filter(r => dayjs(r.predictedDate).isAfter(dayjs()) && dayjs(r.predictedDate).diff(dayjs(), 'day') < 7)
        .sort((a, b) => a.predictedDate.getTime() - b.predictedDate.getTime())[0];

    if (nextUp) {
        insights.push({
            id: `recurring-${nextUp.merchant}`,
            type: 'recurring',
            title: 'Upcoming Bill',
            message: `Expect ${formatCurrency(nextUp.amount, currency)} for ${nextUp.merchant} soon.`,
            icon: 'CalendarClock',
            color: '$blue10',
            priority: 8,
        });
    }

    // 3. Weekend Spender Tip
    const isWeekend = [0, 6].includes(dayjs().day());
    if (isWeekend) {
        insights.push({
            id: 'weekend-tip',
            type: 'tip',
            title: 'Weekend Wise',
            message: 'Weekend spending is typically 20% higher. Stay mindful!',
            icon: 'Smile',
            color: '$green',
            priority: 5,
        });
    }

    return insights.sort((a, b) => b.priority - a.priority);
}
