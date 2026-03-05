import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const dateFilter = createTool({
    id: 'date-filter',
    description: 'Filter transactions by date range, specific month, or year. Useful for analyzing specific time periods.',
    inputSchema: z.object({
        transactions: z.array(
            z.object({
                date: z.string(),
                amount: z.number(),
                narration: z.string(),
                type: z.enum(['debit', 'credit']),
                category: z.string().optional(),
            })
        ).describe('Array of transactions to filter'),
        filter: z.object({
            startDate: z.string().optional().describe('Start date in ISO format (YYYY-MM-DD)'),
            endDate: z.string().optional().describe('End date in ISO format (YYYY-MM-DD)'),
            month: z.number().min(1).max(12).optional().describe('Specific month (1-12)'),
            year: z.number().optional().describe('Specific year'),
            type: z.enum(['debit', 'credit', 'all']).optional().default('all'),
            minAmount: z.number().optional().describe('Minimum transaction amount'),
            maxAmount: z.number().optional().describe('Maximum transaction amount'),
        }),
    }),
    outputSchema: z.object({
        filteredTransactions: z.array(
            z.object({
                date: z.string(),
                amount: z.number(),
                narration: z.string(),
                type: z.enum(['debit', 'credit']),
                category: z.string().optional(),
            })
        ),
        summary: z.object({
            totalFiltered: z.number(),
            totalOriginal: z.number(),
            totalDebit: z.number(),
            totalCredit: z.number(),
            netFlow: z.number(),
            dateRange: z.object({
                start: z.string().nullable(),
                end: z.string().nullable(),
            }),
        }),
        filterApplied: z.object({
            startDate: z.string().nullable(),
            endDate: z.string().nullable(),
            month: z.number().nullable(),
            year: z.number().nullable(),
            type: z.string(),
            minAmount: z.number().nullable(),
            maxAmount: z.number().nullable(),
        }),
    }),
    execute: async ({ context }) => {
        const { transactions, filter } = context;

        let filtered = transactions.map(tx => ({
            ...tx,
            dateObj: new Date(tx.date),
        }));

        // Apply date range filter
        if (filter.startDate) {
            const start = new Date(filter.startDate);
            filtered = filtered.filter(tx => tx.dateObj >= start);
        }

        if (filter.endDate) {
            const end = new Date(filter.endDate);
            end.setHours(23, 59, 59, 999); // Include the entire end day
            filtered = filtered.filter(tx => tx.dateObj <= end);
        }

        // Apply month filter
        if (filter.month !== undefined) {
            filtered = filtered.filter(tx => tx.dateObj.getMonth() + 1 === filter.month);
        }

        // Apply year filter
        if (filter.year !== undefined) {
            filtered = filtered.filter(tx => tx.dateObj.getFullYear() === filter.year);
        }

        // Apply type filter
        if (filter.type && filter.type !== 'all') {
            filtered = filtered.filter(tx => tx.type === filter.type);
        }

        // Apply amount filters
        if (filter.minAmount !== undefined) {
            filtered = filtered.filter(tx => Math.abs(tx.amount) >= filter.minAmount!);
        }

        if (filter.maxAmount !== undefined) {
            filtered = filtered.filter(tx => Math.abs(tx.amount) <= filter.maxAmount!);
        }

        // Sort by date
        filtered.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

        // Calculate summary
        const debits = filtered.filter(tx => tx.type === 'debit');
        const credits = filtered.filter(tx => tx.type === 'credit');
        const totalDebit = debits.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        const totalCredit = credits.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

        const dateRange = {
            start: filtered.length > 0 ? filtered[0].date : null,
            end: filtered.length > 0 ? filtered[filtered.length - 1].date : null,
        };

        // Remove dateObj from output
        const filteredTransactions = filtered.map(({ dateObj, ...tx }) => tx);

        return {
            filteredTransactions,
            summary: {
                totalFiltered: filtered.length,
                totalOriginal: transactions.length,
                totalDebit,
                totalCredit,
                netFlow: totalCredit - totalDebit,
                dateRange,
            },
            filterApplied: {
                startDate: filter.startDate || null,
                endDate: filter.endDate || null,
                month: filter.month || null,
                year: filter.year || null,
                type: filter.type || 'all',
                minAmount: filter.minAmount || null,
                maxAmount: filter.maxAmount || null,
            },
        };
    },
});
