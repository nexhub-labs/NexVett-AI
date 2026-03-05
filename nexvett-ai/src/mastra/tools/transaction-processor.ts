import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { analyzerPipeline } from '../analyzers';
import { logger } from '../lib/logger';

export const transactionProcessor = createTool({
    id: 'process-transactions',
    description: 'Process and analyze pre-parsed transaction data from bank statements. Accepts transaction JSON directly (no file parsing needed). Returns enriched transactions with categorization, merchant normalization, fee detection, and insights.',
    inputSchema: z.object({
        transactions: z.array(z.object({
            date: z.string().describe('ISO date string of the transaction'),
            amount: z.number().describe('Transaction amount (positive number)'),
            narration: z.string().describe('Transaction description/narration'),
            type: z.enum(['debit', 'credit']).describe('Transaction type'),
            balance: z.number().optional().describe('Account balance after transaction'),
        })).describe('Array of parsed transactions from the bank statement'),
    }),
    execute: async ({ context }) => {
        const { transactions } = context;
        const errors: string[] = [];

        try {
            if (!transactions || transactions.length === 0) {
                return {
                    success: false,
                    transactions: [],
                    summary: null,
                    errors: ['No transactions provided']
                };
            }

            // Convert to internal transaction format
            const internalTransactions = transactions.map(tx => ({
                date: new Date(tx.date),
                amount: tx.amount,
                narration: tx.narration,
                type: tx.type,
                balance: tx.balance,
            }));

            // Run through Analyzer Pipeline for enrichment
            const pipelineResult = await analyzerPipeline.analyze(internalTransactions);
            const { categorization, merchantNormalization } = pipelineResult;

            if (pipelineResult.errors.length > 0) {
                logger.warn('Analyzer errors:', pipelineResult.errors);
            }

            // Enrich Transactions
            const enrichedTransactions = internalTransactions.map((tx, index) => {
                const catResult = categorization?.transactions[index];
                const merchResult = merchantNormalization?.transactions[index];

                return {
                    date: tx.date.toISOString(),
                    amount: tx.amount,
                    narration: tx.narration,
                    type: tx.type,
                    category: catResult?.normalizedCategory || 'uncategorized',
                    merchant: merchResult?.merchantName || undefined,
                    balance: tx.balance,
                };
            });

            // Generate Summary
            const totalDebit = enrichedTransactions
                .filter(tx => tx.type === 'debit')
                .reduce((sum, tx) => sum + tx.amount, 0);

            const totalCredit = enrichedTransactions
                .filter(tx => tx.type === 'credit')
                .reduce((sum, tx) => sum + tx.amount, 0);

            const dates = internalTransactions.map(tx => tx.date).sort((a, b) => a.getTime() - b.getTime());

            const summary = {
                totalTransactions: enrichedTransactions.length,
                totalDebit,
                totalCredit,
                dateRange: {
                    start: dates[0]?.toISOString() || null,
                    end: dates[dates.length - 1]?.toISOString() || null,
                },
            };

            return {
                success: true,
                transactions: enrichedTransactions,
                summary,
                errors,
            };
        } catch (error) {
            logger.error('Processing failed:', error); // Replaced console.error with logger.error
            return {
                success: false,
                transactions: [],
                summary: null,
                errors: [`Processing failed: ${error instanceof Error ? error.message : String(error)}`],
            };
        }
    },
});
