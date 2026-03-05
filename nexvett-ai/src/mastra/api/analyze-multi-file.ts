import { analyzeTransactions, Transaction } from './analyze-transactions';
import { parseMultipleFiles, type ParsedFileResult } from './parse-multi-file';
import { mergeTransactions, type FileTransactions } from '../analyzers/transaction-merger';
import type {
  AnalysisMode,
  MultiFileAnalysisResult,
  CombinedAnalysisResult,
  SeparateAnalysisResult,
  CompareAnalysisResult,
  UnifiedAnalysisResult,
} from '../types/multi-file';
import { createLogger } from '../lib/logger';

const logger = createLogger('MultiAnalyze');

/**
 * Analyze multiple files based on the selected mode
 * Parallelizes both individual and combined analysis for peak performance
 */
export async function analyzeMultiFile(
  files: Array<{ buffer: Buffer; filename: string; size: number }>,
  mode: AnalysisMode
): Promise<MultiFileAnalysisResult> {
  // logger.info(`Starting unified analysis for ${files.length} files`);

  // Step 1: Parse all files (Parallelized internally in parseMultipleFiles)
  const parseResult = await parseMultipleFiles(files);

  if (!parseResult.success) {
    return {
      mode,
      success: false,
      errors: parseResult.errors,
    };
  }

  // Filter successful parses
  const successfulFiles = parseResult.files.filter((f) => f.parseResult.success);

  if (successfulFiles.length === 0) {
    return {
      mode,
      success: false,
      errors: ['No files were successfully parsed'],
    };
  }

  try {
    // Step 2: Parallel Analysis Strategy
    // We always run both individual and combined analyses in parallel
    // This populates the "unified" result which the frontend will use

    const [individualResults, combinedResult] = await Promise.all([
      analyzeAllFilesSeparately(successfulFiles),
      analyzeCombined(successfulFiles)
    ]);

    const unified: UnifiedAnalysisResult = {
      files: individualResults.files,
      combined: combinedResult.combined!,
      summary: {
        totalFiles: successfulFiles.length,
        totalTransactions: individualResults.aggregate.totalTransactions,
        totalIncome: individualResults.aggregate.totalIncome,
        totalExpenses: individualResults.aggregate.totalExpenses,
        netFlow: individualResults.aggregate.netFlow,
      }
    };

    // Return unified by default or mode-specific for backward compatibility
    return {
      mode,
      success: true,
      errors: [],
      unified,
      // Backward compatibility fields
      combined: combinedResult.combined!,
      separate: individualResults,
    };

  } catch (error) {
    logger.error(`Analysis workflow failed: ${error instanceof Error ? error.message : String(error)}`);
    return {
      mode,
      success: false,
      errors: [`Analysis failed: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

/**
 * Internal helper to analyze all files separately in parallel
 */
async function analyzeAllFilesSeparately(files: ParsedFileResult[]): Promise<SeparateAnalysisResult> {
  const analysisPromises = files.map(async (file) => {
    const analysisInput: Transaction[] = file.parseResult.transactions.map((tx) => ({
      date: tx.date as string | Date,
      amount: tx.amount,
      narration: tx.narration,
      type: tx.type as 'debit' | 'credit',
      balance: tx.balance,
    }));

    const analysis = await analyzeTransactions(analysisInput);

    return {
      fileId: file.fileId,
      fileName: file.fileName,
      metadata: file.metadata,
      transactions: file.parseResult.transactions.map((tx) => ({
        date: toSafeISOString(tx.date),
        amount: tx.amount,
        narration: tx.narration,
        type: tx.type as "debit" | "credit",
        balance: tx.balance,
      })),
      analysis,
    };
  });

  const results = await Promise.all(analysisPromises);

  let totalIncome = 0;
  let totalExpenses = 0;
  let totalTransactions = 0;

  results.forEach(res => {
    totalIncome += res.analysis.summary.totalIncome;
    totalExpenses += res.analysis.summary.totalExpenses;
    totalTransactions += res.analysis.summary.totalTransactions;
  });

  return {
    files: results,
    aggregate: {
      totalTransactions,
      totalIncome,
      totalExpenses,
      netFlow: totalIncome - totalExpenses,
    },
  };
}

/**
 * Combined mode: Merge all transactions and analyze as one dataset
 */
async function analyzeCombined(files: ParsedFileResult[]): Promise<MultiFileAnalysisResult> {
  // logger.info(`Merging ${files.length} files`);

  // Prepare file transactions for merger
  const fileTransactions: FileTransactions[] = files.map((f) => ({
    fileId: f.fileId,
    fileName: f.fileName,
    transactions: f.parseResult.transactions.map((tx) => ({
      date: toSafeDate(tx.date as string | Date),
      amount: tx.amount,
      narration: tx.narration,
      type: tx.type as "debit" | "credit",
      balance: tx.balance,
    })),
  }));

  // Merge transactions with duplicate detection
  const mergeResult = mergeTransactions(fileTransactions, {
    removeDuplicates: true,
    sortByDate: true,
  });

  // Convert to analysis input format
  const analysisInput: Transaction[] = mergeResult.transactions.map((tx) => ({
    date: toSafeISOString(tx.date),
    amount: tx.amount,
    narration: tx.narration,
    type: tx.type,
    balance: tx.balance,
  }));

  // Analyze merged dataset
  const analysis = await analyzeTransactions(analysisInput);

  const combined: CombinedAnalysisResult = {
    transactions: mergeResult.transactions.map(t => ({
      ...t,
      date: typeof t.date === 'string' ? t.date : toSafeISOString(t.date)
    })),
    analysis,
    fileContributions: mergeResult.summary.fileContributions,
  };

  return {
    mode: 'unified',
    success: analysis.success,
    errors: analysis.errors,
    combined,
  };
}

/**
 * Helper to safely convert a date string or Date object to a Date object
 */
function toSafeDate(date: string | Date): Date {
  const d = new Date(date);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Helper to safely convert a date to ISO string
 */
function toSafeISOString(date: string | Date): string {
  const d = new Date(date);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}
