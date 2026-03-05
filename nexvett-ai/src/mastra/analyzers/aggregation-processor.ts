import { BaseProcessorImpl } from './base-processor';
import { AnalysisContext, ProcessorResult, Transaction } from '../types/transaction';

export interface AggregationResult {
    summary: {
        totalTransactions: number;
        totalIncome: number;
        totalExpenses: number;
        netFlow: number;
        savingsRate: number;
        averageTransactionAmount: number;
        largestIncome: Transaction | null;
        largestExpense: Transaction | null;
    };
    categoryBreakdown: {
        category: string;
        count: number;
        totalAmount: number;
        percentage: number;
    }[];
    monthlyBreakdown: {
        month: string;
        transactionCount: number;
        income: number;
        expenses: number;
        net: number;
    }[];
    dateRange: {
        start: Date | null;
        end: Date | null;
        totalDays: number;
    };
}

export class AggregationProcessor extends BaseProcessorImpl {
    readonly name = 'aggregation';

    async process(context: AnalysisContext): Promise<ProcessorResult> {
        try {
            const transactions = this.getTransactions(context);

            if (transactions.length === 0) {
                return this.success({
                    summary: {
                        totalTransactions: 0, totalIncome: 0, totalExpenses: 0, netFlow: 0, savingsRate: 0,
                        averageTransactionAmount: 0, largestIncome: null, largestExpense: null
                    },
                    categoryBreakdown: [],
                    monthlyBreakdown: [],
                    dateRange: { start: null, end: null, totalDays: 0 }
                }, [], 0);
            }

            const summary = this.calculateSummary(transactions);
            const categoryBreakdown = this.calculateCategoryBreakdown(transactions);
            const monthlyBreakdown = this.calculateMonthlyBreakdown(transactions);
            const dateRange = this.calculateDateRange(transactions);

            return this.success({ summary, categoryBreakdown, monthlyBreakdown, dateRange }, transactions, transactions.length);
        } catch (error) {
            return this.failure(`Aggregation failed: ${error instanceof Error ? error.message : String(error)}`, context.transactions);
        }
    }

    private calculateSummary(transactions: Transaction[]): AggregationResult['summary'] {
        const incomes = transactions.filter(tx => tx.type === 'credit');
        const expenses = transactions.filter(tx => tx.type === 'debit');

        const totalIncome = incomes.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        const totalExpenses = expenses.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        const totalAmount = transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

        const largestIncome = incomes.length > 0
            ? incomes.reduce((max, tx) => Math.abs(tx.amount) > Math.abs(max.amount) ? tx : max)
            : null;

        const largestExpense = expenses.length > 0
            ? expenses.reduce((max, tx) => Math.abs(tx.amount) > Math.abs(max.amount) ? tx : max)
            : null;

        return {
            totalTransactions: transactions.length,
            totalIncome,
            totalExpenses,
            netFlow: totalIncome - totalExpenses,
            savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
            averageTransactionAmount: totalAmount / transactions.length,
            largestIncome,
            largestExpense
        };
    }

    private calculateCategoryBreakdown(transactions: Transaction[]): AggregationResult['categoryBreakdown'] {
        // IMPORTANT: Only include DEBIT transactions (expenses) for spending breakdown
        // Income (credits) should NOT appear in "Spending by Category"
        const expenseTransactions = transactions.filter(tx => tx.type === 'debit');

        const categoryMap = new Map<string, { count: number; totalAmount: number }>();
        const totalAmount = expenseTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

        for (const tx of expenseTransactions) {
            const category = tx.category || 'uncategorized';
            const existing = categoryMap.get(category) || { count: 0, totalAmount: 0 };
            categoryMap.set(category, {
                count: existing.count + 1,
                totalAmount: existing.totalAmount + Math.abs(tx.amount)
            });
        }

        return Array.from(categoryMap.entries())
            .map(([category, data]) => ({
                category,
                count: data.count,
                totalAmount: data.totalAmount,
                percentage: totalAmount > 0 ? (data.totalAmount / totalAmount) * 100 : 0
            }))
            .sort((a, b) => b.totalAmount - a.totalAmount);
    }

    private calculateMonthlyBreakdown(transactions: Transaction[]): AggregationResult['monthlyBreakdown'] {
        const monthMap = new Map<string, { count: number; income: number; expenses: number }>();

        for (const tx of transactions) {
            const monthKey = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
            const existing = monthMap.get(monthKey) || { count: 0, income: 0, expenses: 0 };

            monthMap.set(monthKey, {
                count: existing.count + 1,
                income: existing.income + (tx.type === 'credit' ? Math.abs(tx.amount) : 0),
                expenses: existing.expenses + (tx.type === 'debit' ? Math.abs(tx.amount) : 0)
            });
        }

        return Array.from(monthMap.entries())
            .map(([month, data]) => ({
                month,
                transactionCount: data.count,
                income: data.income,
                expenses: data.expenses,
                net: data.income - data.expenses
            }))
            .sort((a, b) => a.month.localeCompare(b.month));
    }

    private calculateDateRange(transactions: Transaction[]): AggregationResult['dateRange'] {
        if (transactions.length === 0) {
            return { start: null, end: null, totalDays: 0 };
        }

        const dates = transactions.map(tx => tx.date).sort((a, b) => a.getTime() - b.getTime());
        const start = dates[0];
        const end = dates[dates.length - 1];
        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        return { start, end, totalDays };
    }
}

export const aggregationProcessor = new AggregationProcessor();
