import { BaseProcessorImpl } from './base-processor';
import { AnalysisContext, ProcessorResult, Transaction } from '../types/transaction';

export interface RecurringTransaction {
    description: string;
    amount: number;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    occurrences: number;
    confidence: number;
    dates: Date[];
}

export interface UnusualTransaction extends Transaction {
    reason: string;
    severity: 'low' | 'medium' | 'high';
}

export interface PatternAnalysisResult {
    recurringTransactions: RecurringTransaction[];
    unusualTransactions: UnusualTransaction[];
    timePatterns: {
        busiestDayOfWeek: string;
        busiestTimeOfMonth: string;
        averageTransactionsPerDay: number;
    };
    incomeVsExpense: {
        months: { month: string; income: number; expenses: number; net: number }[];
        averageMonthlyIncome: number;
        averageMonthlyExpenses: number;
    };
}

export class PatternAnalyzer extends BaseProcessorImpl {
    readonly name = 'pattern-analyzer';

    async process(context: AnalysisContext): Promise<ProcessorResult> {
        try {
            const transactions = this.getTransactions(context);
            if (transactions.length === 0) {
                return this.success({
                    recurringTransactions: [],
                    unusualTransactions: [],
                    timePatterns: { busiestDayOfWeek: 'N/A', busiestTimeOfMonth: 'N/A', averageTransactionsPerDay: 0 },
                    incomeVsExpense: { months: [], averageMonthlyIncome: 0, averageMonthlyExpenses: 0 }
                }, [], 0);
            }

            const recurringTransactions = this.detectRecurringTransactions(transactions);
            const unusualTransactions = this.detectUnusualTransactions(transactions);
            const timePatterns = this.analyzeTimePatterns(transactions);
            const incomeVsExpense = this.analyzeIncomeVsExpense(transactions);

            return this.success({ recurringTransactions, unusualTransactions, timePatterns, incomeVsExpense }, transactions, transactions.length);
        } catch (error) {
            return this.failure(`Pattern analysis failed: ${error instanceof Error ? error.message : String(error)}`, context.transactions);
        }
    }

    private detectRecurringTransactions(transactions: Transaction[]): RecurringTransaction[] {
        const recurring: RecurringTransaction[] = [];
        const grouped = new Map<string, Transaction[]>();

        // Group by similar narration and amount
        for (const tx of transactions) {
            const key = `${tx.narration.substring(0, 20).toUpperCase()}_${Math.abs(tx.amount).toFixed(0)}`;
            const group = grouped.get(key) || [];
            group.push(tx);
            grouped.set(key, group);
        }

        // Analyze groups for recurrence patterns
        for (const [key, txs] of grouped.entries()) {
            if (txs.length < 2) continue;

            const dates = txs.map(tx => new Date(tx.date as string | Date)).sort((a, b) => a.getTime() - b.getTime());
            const frequency = this.detectFrequency(dates);

            if (frequency) {
                recurring.push({
                    description: txs[0].narration,
                    amount: Math.abs(txs[0].amount),
                    frequency,
                    occurrences: txs.length,
                    confidence: Math.min(txs.length / 5, 1),
                    dates
                });
            }
        }

        return recurring.sort((a, b) => b.occurrences - a.occurrences).slice(0, 20);
    }

    private detectFrequency(dates: Date[]): RecurringTransaction['frequency'] | null {
        if (dates.length < 2) return null;

        const intervals = [];
        for (let i = 1; i < dates.length; i++) {
            intervals.push((dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24));
        }

        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

        if (avgInterval <= 2) return 'daily';
        if (avgInterval >= 5 && avgInterval <= 10) return 'weekly';
        if (avgInterval >= 25 && avgInterval <= 35) return 'monthly';
        if (avgInterval >= 85 && avgInterval <= 100) return 'quarterly';
        if (avgInterval >= 350 && avgInterval <= 380) return 'yearly';

        return null;
    }

    private detectUnusualTransactions(transactions: Transaction[]): UnusualTransaction[] {
        const unusual: UnusualTransaction[] = [];
        const debits = transactions.filter(tx => tx.type === 'debit').map(tx => Math.abs(tx.amount));

        if (debits.length < 3) return [];

        const mean = debits.reduce((a, b) => a + b, 0) / debits.length;
        const stdDev = Math.sqrt(debits.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / debits.length);
        const threshold = mean + (2 * stdDev);

        for (const tx of transactions) {
            if (tx.type === 'debit' && Math.abs(tx.amount) > threshold) {
                const deviation = (Math.abs(tx.amount) - mean) / stdDev;
                unusual.push({
                    ...tx,
                    reason: `Amount is ${deviation.toFixed(1)}x standard deviations above average`,
                    severity: deviation > 4 ? 'high' : deviation > 3 ? 'medium' : 'low'
                });
            }
        }

        return unusual.slice(0, 10);
    }

    private analyzeTimePatterns(transactions: Transaction[]) {
        const dayCount: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        const weekOfMonth: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        for (const tx of transactions) {
            const d = new Date(tx.date as string | Date);
            dayCount[d.getDay()]++;
            weekOfMonth[Math.ceil(d.getDate() / 7)]++;
        }

        const busiestDay = Object.entries(dayCount).reduce((a, b) => a[1] > b[1] ? a : b);
        const busiestWeek = Object.entries(weekOfMonth).reduce((a, b) => a[1] > b[1] ? a : b);

        const dateRange = transactions.length > 0
            ? (new Date(transactions[transactions.length - 1].date as string | Date).getTime() - new Date(transactions[0].date as string | Date).getTime()) / (1000 * 60 * 60 * 24)
            : 1;

        return {
            busiestDayOfWeek: days[parseInt(busiestDay[0])],
            busiestTimeOfMonth: `Week ${busiestWeek[0]}`,
            averageTransactionsPerDay: transactions.length / Math.max(dateRange, 1)
        };
    }

    private analyzeIncomeVsExpense(transactions: Transaction[]) {
        const monthlyData = new Map<string, { income: number; expenses: number }>();

        for (const tx of transactions) {
            const d = new Date(tx.date as string | Date);
            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const data = monthlyData.get(monthKey) || { income: 0, expenses: 0 };

            if (tx.type === 'credit') {
                data.income += Math.abs(tx.amount);
            } else {
                data.expenses += Math.abs(tx.amount);
            }

            monthlyData.set(monthKey, data);
        }

        const months = Array.from(monthlyData.entries())
            .map(([month, data]) => ({ month, income: data.income, expenses: data.expenses, net: data.income - data.expenses }))
            .sort((a, b) => a.month.localeCompare(b.month));

        const totalIncome = months.reduce((sum, m) => sum + m.income, 0);
        const totalExpenses = months.reduce((sum, m) => sum + m.expenses, 0);

        return {
            months,
            averageMonthlyIncome: months.length > 0 ? totalIncome / months.length : 0,
            averageMonthlyExpenses: months.length > 0 ? totalExpenses / months.length : 0
        };
    }
}

export const patternAnalyzer = new PatternAnalyzer();
