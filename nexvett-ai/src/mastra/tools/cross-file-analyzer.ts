import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { TransactionWithSource } from '../types/multi-file';

/**
 * Tool to identify patterns and trends across multiple files
 * Detects recurring transactions, spending trends, and anomalies
 */
export const crossFileAnalyzer = createTool({
  id: 'crossFileAnalyzer',
  description: 'Identify patterns and trends across multiple files. Detects recurring transactions, spending trends, seasonal patterns, and anomalies that span multiple statements.',
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
    })).describe('Array of transactions with source file information'),
    analysisType: z.enum(['trends', 'recurring', 'anomalies', 'all']).describe('Type of analysis to perform'),
  }),
  outputSchema: z.object({
    patterns: z.array(z.object({
      type: z.string(),
      description: z.string(),
      transactions: z.array(z.object({
        date: z.union([z.string(), z.date()]),
        amount: z.number(),
        narration: z.string(),
        sourceFileName: z.string(),
      })),
      insight: z.string(),
    })),
    trends: z.object({
      monthlyAverages: z.array(z.object({
        month: z.string(),
        income: z.number(),
        expenses: z.number(),
      })).optional(),
      categoryTrends: z.array(z.object({
        category: z.string(),
        trend: z.string(),
        change: z.number(),
      })).optional(),
    }),
    insights: z.array(z.string()),
  }),
  execute: async ({ context }) => {
    const { transactions, analysisType } = context;
    const patterns: any[] = [];
    const insights: string[] = [];

    // Recurring transactions analysis
    if (analysisType === 'recurring' || analysisType === 'all') {
      const narrationMap = new Map<string, TransactionWithSource[]>();
      
      transactions.forEach((tx: TransactionWithSource) => {
        const key = `${tx.narration.toLowerCase()}-${tx.amount}`;
        const existing = narrationMap.get(key) || [];
        existing.push(tx);
        narrationMap.set(key, existing);
      });

      // Find recurring (appears in multiple files)
      narrationMap.forEach((txs, key) => {
        const uniqueFiles = new Set(txs.map(tx => tx.sourceFileId));
        if (uniqueFiles.size >= 2 && txs.length >= 2) {
          patterns.push({
            type: 'recurring',
            description: `Recurring payment: ${txs[0].narration}`,
            transactions: txs.map(tx => ({
              date: tx.date,
              amount: tx.amount,
              narration: tx.narration,
              sourceFileName: tx.sourceFileName,
            })),
            insight: `This transaction appears ${txs.length} times across ${uniqueFiles.size} files, suggesting a recurring payment of ₦${txs[0].amount.toFixed(2)}`,
          });
        }
      });
    }

    // Trend analysis
    if (analysisType === 'trends' || analysisType === 'all') {
      // Group by file for trend analysis
      const fileMap = new Map<string, TransactionWithSource[]>();
      transactions.forEach((tx: TransactionWithSource) => {
        const existing = fileMap.get(tx.sourceFileId) || [];
        existing.push(tx);
        fileMap.set(tx.sourceFileId, existing);
      });

      // Calculate monthly averages
      const monthlyAverages = Array.from(fileMap.entries()).map(([fileId, txs]) => {
        const fileName = txs[0].sourceFileName;
        const income = txs.filter(tx => tx.type === 'credit').reduce((sum, tx) => sum + tx.amount, 0);
        const expenses = txs.filter(tx => tx.type === 'debit').reduce((sum, tx) => sum + tx.amount, 0);
        
        return {
          month: fileName,
          income,
          expenses,
        };
      });

      // Category trends
      const categoryTrends: any[] = [];
      if (fileMap.size >= 2) {
        const files = Array.from(fileMap.values());
        const firstFile = files[0];
        const lastFile = files[files.length - 1];

        // Compare categories between first and last file
        const firstCategories = new Map<string, number>();
        const lastCategories = new Map<string, number>();

        firstFile.forEach(tx => {
          if (tx.category && tx.type === 'debit') {
            firstCategories.set(tx.category, (firstCategories.get(tx.category) || 0) + tx.amount);
          }
        });

        lastFile.forEach(tx => {
          if (tx.category && tx.type === 'debit') {
            lastCategories.set(tx.category, (lastCategories.get(tx.category) || 0) + tx.amount);
          }
        });

        firstCategories.forEach((firstAmount, category) => {
          const lastAmount = lastCategories.get(category) || 0;
          if (firstAmount > 0) {
            const change = ((lastAmount - firstAmount) / firstAmount) * 100;
            if (Math.abs(change) > 15) {
              categoryTrends.push({
                category,
                trend: change > 0 ? 'increasing' : 'decreasing',
                change: Math.abs(change),
              });
            }
          }
        });
      }

      insights.push(`Analyzed ${fileMap.size} files with ${transactions.length} total transactions`);
      if (categoryTrends.length > 0) {
        insights.push(`Found ${categoryTrends.length} categories with significant spending changes`);
      }
    }

    // Anomaly detection
    if (analysisType === 'anomalies' || analysisType === 'all') {
      // Find unusually large transactions
      const amounts = transactions.map((tx: TransactionWithSource) => tx.amount);
      const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
      const stdDev = Math.sqrt(
        amounts.reduce((sum, amt) => sum + Math.pow(amt - avgAmount, 2), 0) / amounts.length
      );

      const anomalies = transactions.filter((tx: TransactionWithSource) => 
        tx.type === 'debit' && tx.amount > avgAmount + (2 * stdDev)
      );

      if (anomalies.length > 0) {
        patterns.push({
          type: 'anomaly',
          description: 'Unusually large transactions detected',
          transactions: anomalies.map((tx: TransactionWithSource) => ({
            date: tx.date,
            amount: tx.amount,
            narration: tx.narration,
            sourceFileName: tx.sourceFileName,
          })),
          insight: `Found ${anomalies.length} transactions significantly above average (>2 standard deviations)`,
        });
      }
    }

    return {
      patterns,
      trends: {
        monthlyAverages: analysisType === 'trends' || analysisType === 'all' ? [] : undefined,
        categoryTrends: analysisType === 'trends' || analysisType === 'all' ? [] : undefined,
      },
      insights,
    };
  },
});
