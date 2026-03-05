import { analyzerPipeline } from '../analyzers';
import type { Transaction as InternalTransaction } from '../types/transaction';
import type { Transaction, AnalysisResult } from '@nexvett-ai/shared';

// Re-export shared types for convenience
export type { Transaction, AnalysisResult };

export async function analyzeTransactions(
  transactionsInput: Transaction[]
): Promise<AnalysisResult> {
  try {
    const transactions: InternalTransaction[] = transactionsInput.map((tx) => ({
      date: new Date(tx.date),
      amount: tx.amount,
      narration: tx.narration,
      type: tx.type,
      balance: tx.balance,
    }));

    const result = await analyzerPipeline.analyze(transactions);

    const analyzedTransactions = transactions.map((tx, index) => {
      const categorized = result.categorization?.transactions[index];
      const normalized = result.merchantNormalization?.transactions[index];
      const fee = result.feeDetection?.fees.find(
        (f) => new Date(f.date).getTime() === new Date(tx.date).getTime() && f.amount === tx.amount
      );

      return {
        date: tx.date instanceof Date ? tx.date.toISOString() : tx.date,
        amount: tx.amount,
        narration: tx.narration,
        type: tx.type,
        normalizedCategory: categorized?.normalizedCategory || 'uncategorized',
        subCategory: categorized?.subCategory,
        merchantName: normalized?.merchantName,
        isHiddenFee: fee?.isHidden || false,
      };
    });

    const feeAudit = {
      totalHiddenFees: result.feeDetection?.feeAudit.totalHiddenFees || 0,
      feeCount: result.feeDetection?.feeAudit.feeCount || 0,
      feeBreakdown: (result.feeDetection?.feeAudit.feeBreakdown || []).map((f) => ({
        type: f.type,
        count: f.count,
        totalAmount: f.totalAmount,
      })),
      recommendations: result.feeDetection?.recommendations || [],
    };

    const categoryBreakdown = result.categorization?.categorySummary || [];
    const merchantSummary = (result.merchantNormalization?.merchantSummary || []).slice(0, 20);

    const patternInsights = {
      recurringTransactions: (result.patternAnalysis?.recurringTransactions || []).slice(0, 10).map((r) => ({
        description: r.description,
        amount: r.amount,
        frequency: r.frequency,
        occurrences: r.occurrences,
      })),
      unusualTransactions: (result.patternAnalysis?.unusualTransactions || []).slice(0, 5).map((u) => ({
        narration: u.narration,
        amount: u.amount,
        reason: u.reason,
      })),
      incomeVsExpense: {
        averageMonthlyIncome: result.patternAnalysis?.incomeVsExpense.averageMonthlyIncome || 0,
        averageMonthlyExpenses: result.patternAnalysis?.incomeVsExpense.averageMonthlyExpenses || 0,
      },
    };

    const summary = {
      totalTransactions: result.aggregation?.summary.totalTransactions || transactions.length,
      totalIncome: result.aggregation?.summary.totalIncome || 0,
      totalExpenses: result.aggregation?.summary.totalExpenses || 0,
      netFlow: result.aggregation?.summary.netFlow || 0,
      savingsRate: result.aggregation?.summary.savingsRate || 0,
    };

    return {
      success: result.success,
      analyzedTransactions,
      feeAudit,
      categoryBreakdown,
      merchantSummary,
      patternInsights,
      summary,
      agentInsights: {
        summary: 'Analysis complete (Waiting for AI enhancement)',
        keyFindings: [],
        recommendations: [],
        warnings: [],
      },
      errors: result.errors,
    };
  } catch (error) {
    return {
      success: false,
      analyzedTransactions: [],
      feeAudit: { totalHiddenFees: 0, feeCount: 0, feeBreakdown: [], recommendations: [] },
      categoryBreakdown: [],
      merchantSummary: [],
      patternInsights: {
        recurringTransactions: [],
        unusualTransactions: [],
        incomeVsExpense: { averageMonthlyIncome: 0, averageMonthlyExpenses: 0 },
      },
      summary: { totalTransactions: 0, totalIncome: 0, totalExpenses: 0, netFlow: 0, savingsRate: 0 },
      agentInsights: {
        summary: 'Analysis failed',
        keyFindings: [],
        recommendations: [],
        warnings: [],
      },
      errors: [`Analysis failed: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}
