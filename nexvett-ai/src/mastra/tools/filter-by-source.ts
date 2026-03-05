import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { TransactionWithSource } from '../types/multi-file';

/**
 * Tool to filter transactions by source file IDs
 * Useful for isolating transactions from specific files in multi-file analysis
 */
export const filterBySource = createTool({
  id: 'filterBySource',
  description: 'Filter transactions from specific source files. Use this when you need to analyze transactions from particular files in a multi-file dataset.',
  inputSchema: z.object({
    transactions: z.array(z.object({
      date: z.union([z.string(), z.date()]),
      amount: z.number(),
      narration: z.string(),
      type: z.enum(['debit', 'credit']),
      balance: z.number().optional(),
      sourceFileId: z.string(),
      sourceFileName: z.string(),
    })).describe('Array of transactions with source file information'),
    fileIds: z.array(z.string()).optional().describe('Array of file IDs to filter by. If not provided, returns all transactions.'),
    fileNames: z.array(z.string()).optional().describe('Array of file names to filter by (alternative to fileIds)'),
  }),
  outputSchema: z.object({
    filtered: z.array(z.object({
      date: z.union([z.string(), z.date()]),
      amount: z.number(),
      narration: z.string(),
      type: z.enum(['debit', 'credit']),
      balance: z.number().optional(),
      sourceFileId: z.string(),
      sourceFileName: z.string(),
    })),
    summary: z.object({
      totalTransactions: z.number(),
      totalDebit: z.number(),
      totalCredit: z.number(),
      filesIncluded: z.array(z.object({
        fileId: z.string(),
        fileName: z.string(),
        transactionCount: z.number(),
      })),
    }),
  }),
  execute: async ({ context }) => {
    const { transactions, fileIds, fileNames } = context;

    // Filter transactions
    let filtered: TransactionWithSource[] = transactions;

    if (fileIds && fileIds.length > 0) {
      filtered = transactions.filter((tx: TransactionWithSource) => 
        fileIds.includes(tx.sourceFileId)
      );
    } else if (fileNames && fileNames.length > 0) {
      filtered = transactions.filter((tx: TransactionWithSource) => 
        fileNames.some(name => tx.sourceFileName.toLowerCase().includes(name.toLowerCase()))
      );
    }

    // Calculate summary
    const totalDebit = filtered
      .filter((tx: TransactionWithSource) => tx.type === 'debit')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalCredit = filtered
      .filter((tx: TransactionWithSource) => tx.type === 'credit')
      .reduce((sum, tx) => sum + tx.amount, 0);

    // Group by file
    const fileMap = new Map<string, { fileName: string; count: number }>();
    filtered.forEach((tx: TransactionWithSource) => {
      const existing = fileMap.get(tx.sourceFileId);
      if (existing) {
        existing.count++;
      } else {
        fileMap.set(tx.sourceFileId, { fileName: tx.sourceFileName, count: 1 });
      }
    });

    const filesIncluded = Array.from(fileMap.entries()).map(([fileId, data]) => ({
      fileId,
      fileName: data.fileName,
      transactionCount: data.count,
    }));

    return {
      filtered,
      summary: {
        totalTransactions: filtered.length,
        totalDebit,
        totalCredit,
        filesIncluded,
      },
    };
  },
});
