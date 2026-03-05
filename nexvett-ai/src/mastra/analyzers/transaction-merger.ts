import type { Transaction } from '../types/transaction';
import type { TransactionWithSource } from '../types/multi-file';
import { createLogger } from '../lib/logger';

const logger = createLogger('Merger');

/**
 * Options for merging transactions from multiple files
 */
export interface MergeOptions {
  removeDuplicates: boolean;
  sortByDate: boolean;
  duplicateThreshold?: {
    dateDiffMinutes?: number; // Consider duplicates if within N minutes
    amountDiffPercent?: number; // Consider duplicates if amount differs by less than N%
  };
}

/**
 * Input for merging - transactions from a single file
 */
export interface FileTransactions {
  fileId: string;
  fileName: string;
  transactions: Transaction[];
}

/**
 * Result of duplicate detection
 */
export interface DuplicateInfo {
  transaction: TransactionWithSource;
  duplicateOf: {
    fileId: string;
    fileName: string;
    index: number;
  };
  reason: string;
}

/**
 * Result of merging operation
 */
export interface MergeResult {
  transactions: TransactionWithSource[];
  duplicates: DuplicateInfo[];
  summary: {
    totalTransactions: number;
    uniqueTransactions: number;
    duplicatesRemoved: number;
    fileContributions: Array<{
      fileId: string;
      fileName: string;
      transactionCount: number;
      percentage: number;
    }>;
  };
}

/**
 * Merge transactions from multiple files into a single array
 * with source tracking and optional duplicate removal
 */
export function mergeTransactions(
  fileTransactions: FileTransactions[],
  options: MergeOptions = { removeDuplicates: true, sortByDate: true }
): MergeResult {
  // logger.info(`Merging transactions from ${fileTransactions.length} files`);

  // Add source tracking to all transactions
  const transactionsWithSource: TransactionWithSource[] = [];
  const fileContributions = new Map<string, number>();

  for (const file of fileTransactions) {
    for (const tx of file.transactions) {
      transactionsWithSource.push({
        ...tx,
        sourceFileId: file.fileId,
        sourceFileName: file.fileName,
      });
    }
    fileContributions.set(file.fileId, file.transactions.length);
  }

  // logger.info(`Total transactions before deduplication: ${transactionsWithSource.length}`);

  // Detect duplicates
  const duplicates: DuplicateInfo[] = [];
  let uniqueTransactions = transactionsWithSource;

  if (options.removeDuplicates) {
    const result = detectAndRemoveDuplicates(transactionsWithSource, options);
    uniqueTransactions = result.unique;
    duplicates.push(...result.duplicates);
    // logger.info(`Found ${duplicates.length} duplicates`);
  }

  // Sort by date if requested
  if (options.sortByDate) {
    uniqueTransactions.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });
    // logger.info(`Sorted ${uniqueTransactions.length} transactions by date`);
  }

  // Calculate file contributions
  const contributions = Array.from(fileContributions.entries()).map(([fileId, count]) => {
    const file = fileTransactions.find((f) => f.fileId === fileId);
    return {
      fileId,
      fileName: file?.fileName || 'Unknown',
      transactionCount: count,
      percentage: (count / transactionsWithSource.length) * 100,
    };
  });

  return {
    transactions: uniqueTransactions,
    duplicates,
    summary: {
      totalTransactions: transactionsWithSource.length,
      uniqueTransactions: uniqueTransactions.length,
      duplicatesRemoved: duplicates.length,
      fileContributions: contributions,
    },
  };
}

/**
 * Detect and remove duplicate transactions
 */
function detectAndRemoveDuplicates(
  transactions: TransactionWithSource[],
  options: MergeOptions
): { unique: TransactionWithSource[]; duplicates: DuplicateInfo[] } {
  const unique: TransactionWithSource[] = [];
  const duplicates: DuplicateInfo[] = [];
  const seen = new Map<string, { tx: TransactionWithSource; index: number }>();

  const dateDiffMinutes = options.duplicateThreshold?.dateDiffMinutes ?? 5;
  const amountDiffPercent = options.duplicateThreshold?.amountDiffPercent ?? 0.01;

  for (const tx of transactions) {
    let isDuplicate = false;

    // Check against all previously seen transactions
    for (const [key, seenTx] of seen.entries()) {
      if (areDuplicates(tx, seenTx.tx, dateDiffMinutes, amountDiffPercent)) {
        duplicates.push({
          transaction: tx,
          duplicateOf: {
            fileId: seenTx.tx.sourceFileId,
            fileName: seenTx.tx.sourceFileName,
            index: seenTx.index,
          },
          reason: `Same date (±${dateDiffMinutes}min), amount (±${amountDiffPercent}%), and narration`,
        });
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      const key = `${tx.date}-${tx.amount}-${tx.narration}`;
      seen.set(key, { tx, index: unique.length });
      unique.push(tx);
    }
  }

  return { unique, duplicates };
}

/**
 * Check if two transactions are duplicates
 */
function areDuplicates(
  tx1: TransactionWithSource,
  tx2: TransactionWithSource,
  dateDiffMinutes: number,
  amountDiffPercent: number
): boolean {
  // Skip if from same file
  if (tx1.sourceFileId === tx2.sourceFileId) {
    return false;
  }

  // Check date similarity (within N minutes)
  const date1 = new Date(tx1.date).getTime();
  const date2 = new Date(tx2.date).getTime();
  const dateDiff = Math.abs(date1 - date2);
  const dateDiffMs = dateDiffMinutes * 60 * 1000;

  if (dateDiff > dateDiffMs) {
    return false;
  }

  // Check amount similarity (within N%)
  const amountDiff = Math.abs(tx1.amount - tx2.amount);
  const amountThreshold = tx1.amount * amountDiffPercent;

  if (amountDiff > amountThreshold) {
    return false;
  }

  // Check narration similarity (exact match or very similar)
  const narration1 = tx1.narration.toLowerCase().trim();
  const narration2 = tx2.narration.toLowerCase().trim();

  if (narration1 === narration2) {
    return true;
  }

  // Check if one narration contains the other (for slight variations)
  if (narration1.includes(narration2) || narration2.includes(narration1)) {
    return true;
  }

  return false;
}

/**
 * Filter transactions by source file IDs
 */
export function filterTransactionsBySource(
  transactions: TransactionWithSource[],
  fileIds: string[]
): TransactionWithSource[] {
  return transactions.filter((tx) => fileIds.includes(tx.sourceFileId));
}

/**
 * Group transactions by source file
 */
export function groupBySource(
  transactions: TransactionWithSource[]
): Map<string, TransactionWithSource[]> {
  const groups = new Map<string, TransactionWithSource[]>();

  for (const tx of transactions) {
    const existing = groups.get(tx.sourceFileId) || [];
    existing.push(tx);
    groups.set(tx.sourceFileId, existing);
  }

  return groups;
}
