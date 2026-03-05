import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { TransactionWithSource } from '../types/multi-file';

/**
 * Tool to compare financial metrics across multiple files
 * Generates side-by-side comparison of income, expenses, fees, and categories
 */
export const fileComparator = createTool({
  id: 'fileComparator',
  description: 'Compare financial metrics across multiple uploaded files. Returns side-by-side comparison of income, expenses, fees, and top categories for each file.',
  inputSchema: z.object({
    transactions: z.array(z.object({
      date: z.union([z.string(), z.date()]),
      amount: z.number(),
      narration: z.string(),
      type: z.enum(['debit', 'credit']),
      balance: z.number().optional(),
      sourceFileId: z.string(),
      sourceFileName: z.string(),
      category: z.string().optional(),
      isHiddenFee: z.boolean().optional(),
    })).describe('Array of transactions with source file and category information'),
  }),
  outputSchema: z.object({
    files: z.array(z.object({
      fileId: z.string(),
      fileName: z.string(),
      metrics: z.object({
        totalTransactions: z.number(),
        totalIncome: z.number(),
        totalExpenses: z.number(),
        netFlow: z.number(),
        hiddenFees: z.number(),
        topCategories: z.array(z.object({
          category: z.string(),
          amount: z.number(),
          count: z.number(),
        })),
      }),
    })),
    comparison: z.object({
      incomeChange: z.number().describe('Percentage change from first to last file'),
      expenseChange: z.number().describe('Percentage change from first to last file'),
      netFlowChange: z.number().describe('Absolute change in net flow'),
      insights: z.array(z.string()),
    }),
  }),
  execute: async ({ context }) => {
    const { transactions } = context;

    // Group transactions by file
    const fileMap = new Map<string, TransactionWithSource[]>();
    transactions.forEach((tx: TransactionWithSource) => {
      const existing = fileMap.get(tx.sourceFileId) || [];
      existing.push(tx);
      fileMap.set(tx.sourceFileId, existing);
    });

    // Calculate metrics for each file
    const files = Array.from(fileMap.entries()).map(([fileId, txs]) => {
      const fileName = txs[0].sourceFileName;

      const totalIncome = txs
        .filter(tx => tx.type === 'credit')
        .reduce((sum, tx) => sum + tx.amount, 0);

      const totalExpenses = txs
        .filter(tx => tx.type === 'debit')
        .reduce((sum, tx) => sum + tx.amount, 0);

      const hiddenFees = txs
        .filter(tx => tx.isHiddenFee)
        .reduce((sum, tx) => sum + tx.amount, 0);

      // Top categories
      const categoryMap = new Map<string, { amount: number; count: number }>();
      txs.forEach(tx => {
        if (tx.category && tx.type === 'debit') {
          const existing = categoryMap.get(tx.category) || { amount: 0, count: 0 };
          existing.amount += tx.amount;
          existing.count++;
          categoryMap.set(tx.category, existing);
        }
      });

      const topCategories = Array.from(categoryMap.entries())
        .map(([category, data]) => ({ category, ...data }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      return {
        fileId,
        fileName,
        metrics: {
          totalTransactions: txs.length,
          totalIncome,
          totalExpenses,
          netFlow: totalIncome - totalExpenses,
          hiddenFees,
          topCategories,
        },
      };
    });

    // Calculate comparison metrics
    const insights: string[] = [];
    let incomeChange = 0;
    let expenseChange = 0;
    let netFlowChange = 0;

    if (files.length >= 2) {
      const first = files[0].metrics;
      const last = files[files.length - 1].metrics;

      incomeChange = first.totalIncome > 0
        ? ((last.totalIncome - first.totalIncome) / first.totalIncome) * 100
        : 0;

      expenseChange = first.totalExpenses > 0
        ? ((last.totalExpenses - first.totalExpenses) / first.totalExpenses) * 100
        : 0;

      netFlowChange = last.netFlow - first.netFlow;

      // Generate insights
      if (Math.abs(incomeChange) > 10) {
        insights.push(`Income ${incomeChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(incomeChange).toFixed(1)}%`);
      }

      if (Math.abs(expenseChange) > 10) {
        insights.push(`Expenses ${expenseChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(expenseChange).toFixed(1)}%`);
      }

      if (Math.abs(netFlowChange) > 10000) {
        insights.push(`Net flow ${netFlowChange > 0 ? 'improved' : 'declined'} by ₦${Math.abs(netFlowChange).toFixed(2)}`);
      }

      // Compare fees
      const feeChange = last.hiddenFees - first.hiddenFees;
      if (Math.abs(feeChange) > 100) {
        insights.push(`Hidden fees ${feeChange > 0 ? 'increased' : 'decreased'} by ₦${Math.abs(feeChange).toFixed(2)}`);
      }
    }

    return {
      files,
      comparison: {
        incomeChange,
        expenseChange,
        netFlowChange,
        insights,
      },
    };
  },
});
