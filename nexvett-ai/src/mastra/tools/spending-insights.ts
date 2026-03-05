import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const spendingInsights = createTool({
    id: 'spending-insights',
    description: 'Generate detailed spending insights from analyzed transactions. Provides top spending categories, monthly trends, and savings recommendations.',
    inputSchema: z.object({
        transactions: z.array(
            z.object({
                date: z.string(),
                amount: z.number(),
                narration: z.string(),
                type: z.enum(['debit', 'credit']),
                category: z.string().optional(),
            })
        ).describe('Array of transactions to analyze'),
        includeRecommendations: z.boolean().optional().default(true),
    }),
    outputSchema: z.object({
        topSpendingCategories: z.array(z.object({
            category: z.string(),
            amount: z.number(),
            percentage: z.number(),
            transactionCount: z.number(),
        })),
        monthlyTrends: z.array(z.object({
            month: z.string(),
            income: z.number(),
            expenses: z.number(),
            savings: z.number(),
            savingsRate: z.number(),
        })),
        spendingHabits: z.object({
            averageDailySpend: z.number(),
            highestSpendDay: z.string(),
            lowestSpendDay: z.string(),
            weekdayVsWeekend: z.object({
                weekdayAverage: z.number(),
                weekendAverage: z.number(),
            }),
        }),
        savingsAnalysis: z.object({
            totalSaved: z.number(),
            averageMonthlySavings: z.number(),
            savingsRate: z.number(),
            projectedAnnualSavings: z.number(),
        }),
        recommendations: z.array(z.string()),
    }),
    execute: async ({ context }) => {
        const { transactions, includeRecommendations } = context;

        // Convert and filter transactions
        const txs = transactions.map(tx => ({
            ...tx,
            date: new Date(tx.date),
        }));

        const debits = txs.filter(tx => tx.type === 'debit');
        const credits = txs.filter(tx => tx.type === 'credit');

        // Calculate top spending categories
        const categoryMap = new Map<string, { amount: number; count: number }>();
        for (const tx of debits) {
            const category = tx.category || 'uncategorized';
            const existing = categoryMap.get(category) || { amount: 0, count: 0 };
            categoryMap.set(category, {
                amount: existing.amount + Math.abs(tx.amount),
                count: existing.count + 1,
            });
        }

        const totalSpending = debits.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        const topSpendingCategories = Array.from(categoryMap.entries())
            .map(([category, data]) => ({
                category,
                amount: data.amount,
                percentage: totalSpending > 0 ? (data.amount / totalSpending) * 100 : 0,
                transactionCount: data.count,
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 10);

        // Calculate monthly trends
        const monthlyMap = new Map<string, { income: number; expenses: number }>();
        for (const tx of txs) {
            const monthKey = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
            const existing = monthlyMap.get(monthKey) || { income: 0, expenses: 0 };
            monthlyMap.set(monthKey, {
                income: existing.income + (tx.type === 'credit' ? Math.abs(tx.amount) : 0),
                expenses: existing.expenses + (tx.type === 'debit' ? Math.abs(tx.amount) : 0),
            });
        }

        const monthlyTrends = Array.from(monthlyMap.entries())
            .map(([month, data]) => ({
                month,
                income: data.income,
                expenses: data.expenses,
                savings: data.income - data.expenses,
                savingsRate: data.income > 0 ? ((data.income - data.expenses) / data.income) * 100 : 0,
            }))
            .sort((a, b) => a.month.localeCompare(b.month));

        // Calculate spending habits
        const dailySpending = new Map<string, number>();
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayTotals: Record<number, { total: number; count: number }> = {};

        for (let i = 0; i < 7; i++) {
            dayTotals[i] = { total: 0, count: 0 };
        }

        for (const tx of debits) {
            const dateKey = tx.date.toISOString().split('T')[0];
            const dayOfWeek = tx.date.getDay();

            dailySpending.set(dateKey, (dailySpending.get(dateKey) || 0) + Math.abs(tx.amount));
            dayTotals[dayOfWeek].total += Math.abs(tx.amount);
            dayTotals[dayOfWeek].count++;
        }

        const dailyAmounts = Array.from(dailySpending.values());
        const averageDailySpend = dailyAmounts.length > 0
            ? dailyAmounts.reduce((a, b) => a + b, 0) / dailyAmounts.length
            : 0;

        const dayAverages = Object.entries(dayTotals).map(([day, data]) => ({
            day: parseInt(day),
            average: data.count > 0 ? data.total / data.count : 0,
        }));

        const highestDay = dayAverages.reduce((a, b) => a.average > b.average ? a : b);
        const lowestDay = dayAverages.reduce((a, b) => a.average < b.average ? a : b);

        const weekdayTotal = dayAverages.filter(d => d.day >= 1 && d.day <= 5).reduce((sum, d) => sum + d.average, 0);
        const weekendTotal = dayAverages.filter(d => d.day === 0 || d.day === 6).reduce((sum, d) => sum + d.average, 0);

        const spendingHabits = {
            averageDailySpend,
            highestSpendDay: days[highestDay.day],
            lowestSpendDay: days[lowestDay.day],
            weekdayVsWeekend: {
                weekdayAverage: weekdayTotal / 5,
                weekendAverage: weekendTotal / 2,
            },
        };

        // Calculate savings analysis
        const totalIncome = credits.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        const totalExpenses = debits.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        const totalSaved = totalIncome - totalExpenses;
        const months = monthlyTrends.length || 1;

        const savingsAnalysis = {
            totalSaved,
            averageMonthlySavings: totalSaved / months,
            savingsRate: totalIncome > 0 ? (totalSaved / totalIncome) * 100 : 0,
            projectedAnnualSavings: (totalSaved / months) * 12,
        };

        // Generate recommendations
        const recommendations: string[] = [];

        if (includeRecommendations) {
            if (savingsAnalysis.savingsRate < 20) {
                recommendations.push(`Your savings rate is ${savingsAnalysis.savingsRate.toFixed(1)}%. Aim for at least 20% to build a solid financial foundation.`);
            }

            if (topSpendingCategories[0] && topSpendingCategories[0].percentage > 40) {
                recommendations.push(`${topSpendingCategories[0].category} accounts for ${topSpendingCategories[0].percentage.toFixed(1)}% of spending. Consider diversifying or reducing this category.`);
            }

            if (spendingHabits.weekdayVsWeekend.weekendAverage > spendingHabits.weekdayVsWeekend.weekdayAverage * 2) {
                recommendations.push('Weekend spending is significantly higher than weekdays. Consider budgeting specifically for weekends.');
            }

            const entertainmentCategory = topSpendingCategories.find(c => c.category === 'entertainment');
            if (entertainmentCategory && entertainmentCategory.percentage > 15) {
                recommendations.push(`Entertainment spending is ${entertainmentCategory.percentage.toFixed(1)}% of total. Consider setting a fixed entertainment budget.`);
            }
        }

        return {
            topSpendingCategories,
            monthlyTrends,
            spendingHabits,
            savingsAnalysis,
            recommendations,
        };
    },
});
