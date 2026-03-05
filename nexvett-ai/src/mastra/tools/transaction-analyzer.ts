import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { analyzerPipeline } from '../analyzers';
import { Transaction } from '../types/transaction';

export const transactionAnalyzer = createTool({
    id: 'analyze-transactions',
    description: 'Analyze bank transactions using modular processors: categorization, fee detection, merchant normalization, pattern analysis, and aggregation. Provides comprehensive insights for Nigerian bank transactions.',
    inputSchema: z.object({
        transactions: z.array(
            z.object({
                date: z.string(),
                amount: z.number(),
                narration: z.string(),
                type: z.enum(['debit', 'credit']).optional(),
            })
        ).describe('Array of transactions to analyze'),
        options: z.object({
            includeCategorization: z.boolean().optional().default(true),
            includeFeeDetection: z.boolean().optional().default(true),
            includeMerchantNormalization: z.boolean().optional().default(true),
            includePatternAnalysis: z.boolean().optional().default(true),
            includeAggregation: z.boolean().optional().default(true),
        }).optional(),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        analyzedTransactions: z.array(
            z.object({
                date: z.string(),
                amount: z.number(),
                narration: z.string(),
                type: z.enum(['debit', 'credit']),
                normalizedCategory: z.string(),
                subCategory: z.string().optional(),
                merchantName: z.string().optional(),
                isHiddenFee: z.boolean(),
            })
        ),
        feeAudit: z.object({
            totalHiddenFees: z.number(),
            feeCount: z.number(),
            feeBreakdown: z.array(z.object({
                type: z.string(),
                count: z.number(),
                totalAmount: z.number(),
            })),
            recommendations: z.array(z.string()),
        }),
        categoryBreakdown: z.array(z.object({
            category: z.string(),
            count: z.number(),
            totalAmount: z.number(),
            percentage: z.number(),
        })),
        merchantSummary: z.array(z.object({
            merchant: z.string(),
            count: z.number(),
            totalSpent: z.number(),
        })),
        patternInsights: z.object({
            recurringTransactions: z.array(z.object({
                description: z.string(),
                amount: z.number(),
                frequency: z.string(),
                occurrences: z.number(),
            })),
            unusualTransactions: z.array(z.object({
                narration: z.string(),
                amount: z.number(),
                reason: z.string(),
            })),
            incomeVsExpense: z.object({
                averageMonthlyIncome: z.number(),
                averageMonthlyExpenses: z.number(),
            }),
        }),
        summary: z.object({
            totalTransactions: z.number(),
            totalIncome: z.number(),
            totalExpenses: z.number(),
            netFlow: z.number(),
        }),
        errors: z.array(z.string()),
    }),
    execute: async ({ context }) => {
        try {
            // Convert input transactions to internal format
            const transactions: Transaction[] = context.transactions.map(tx => ({
                date: new Date(tx.date),
                amount: tx.amount,
                narration: tx.narration,
                type: tx.type || (tx.amount >= 0 ? 'credit' : 'debit'),
            }));

            // Run the analyzer pipeline
            const result = await analyzerPipeline.analyze(transactions);

            // Build analyzed transactions with all enrichments
            const analyzedTransactions = transactions.map((tx, index) => {
                const categorized = result.categorization?.transactions[index];
                const normalized = result.merchantNormalization?.transactions[index];
                const fee = result.feeDetection?.fees.find(f =>
                    f.date.getTime() === tx.date.getTime() && f.amount === tx.amount
                );

                return {
                    date: tx.date.toISOString(),
                    amount: tx.amount,
                    narration: tx.narration,
                    type: tx.type,
                    normalizedCategory: categorized?.normalizedCategory || 'uncategorized',
                    subCategory: categorized?.subCategory,
                    merchantName: normalized?.merchantName,
                    isHiddenFee: fee?.isHidden || false,
                };
            });

            // Build fee audit
            const feeAudit = {
                totalHiddenFees: result.feeDetection?.feeAudit.totalHiddenFees || 0,
                feeCount: result.feeDetection?.feeAudit.feeCount || 0,
                feeBreakdown: (result.feeDetection?.feeAudit.feeBreakdown || []).map(f => ({
                    type: f.type,
                    count: f.count,
                    totalAmount: f.totalAmount,
                })),
                recommendations: result.feeDetection?.recommendations || [],
            };

            // Build category breakdown
            const categoryBreakdown = result.categorization?.categorySummary || [];

            // Build merchant summary
            const merchantSummary = (result.merchantNormalization?.merchantSummary || []).slice(0, 20);

            // Build pattern insights
            const patternInsights = {
                recurringTransactions: (result.patternAnalysis?.recurringTransactions || []).slice(0, 10).map(r => ({
                    description: r.description,
                    amount: r.amount,
                    frequency: r.frequency,
                    occurrences: r.occurrences,
                })),
                unusualTransactions: (result.patternAnalysis?.unusualTransactions || []).slice(0, 5).map(u => ({
                    narration: u.narration,
                    amount: u.amount,
                    reason: u.reason,
                })),
                incomeVsExpense: {
                    averageMonthlyIncome: result.patternAnalysis?.incomeVsExpense.averageMonthlyIncome || 0,
                    averageMonthlyExpenses: result.patternAnalysis?.incomeVsExpense.averageMonthlyExpenses || 0,
                },
            };

            // Build summary
            const summary = {
                totalTransactions: result.aggregation?.summary.totalTransactions || transactions.length,
                totalIncome: result.aggregation?.summary.totalIncome || 0,
                totalExpenses: result.aggregation?.summary.totalExpenses || 0,
                netFlow: result.aggregation?.summary.netFlow || 0,
            };

            return {
                success: result.success,
                analyzedTransactions,
                feeAudit,
                categoryBreakdown,
                merchantSummary,
                patternInsights,
                summary,
                errors: result.errors,
            };
        } catch (error) {
            return {
                success: false,
                analyzedTransactions: [],
                feeAudit: { totalHiddenFees: 0, feeCount: 0, feeBreakdown: [], recommendations: [] },
                categoryBreakdown: [],
                merchantSummary: [],
                patternInsights: { recurringTransactions: [], unusualTransactions: [], incomeVsExpense: { averageMonthlyIncome: 0, averageMonthlyExpenses: 0 } },
                summary: { totalTransactions: 0, totalIncome: 0, totalExpenses: 0, netFlow: 0 },
                errors: [`Analysis failed: ${error instanceof Error ? error.message : String(error)}`],
            };
        }
    },
});