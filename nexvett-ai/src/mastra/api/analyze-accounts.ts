import { analyzeTransactions } from './analyze-transactions';
import type { AnalysisResult, Transaction } from './analyze-transactions';

export interface AccountAnalysis {
  accountName: string;
  analysis: AnalysisResult;
}

export interface AccountsAnalysisResult {
  success: boolean;
  accounts: AccountAnalysis[];
  combined: AnalysisResult;
  errors: string[];
}

export async function analyzeAccounts(
  accounts: Array<{
    accountName: string;
    transactions: Transaction[];
  }>
): Promise<AccountsAnalysisResult> {
  try {
    const accountAnalyses: AccountAnalysis[] = [];
    const allTransactions: Transaction[] = [];
    const errors: string[] = [];

    for (const account of accounts) {
      try {
        const analysis = await analyzeTransactions(account.transactions);
        accountAnalyses.push({
          accountName: account.accountName,
          analysis,
        });
        allTransactions.push(...account.transactions);

        if (!analysis.success) {
          errors.push(`${account.accountName}: ${analysis.errors.join(', ')}`);
        }
      } catch (error) {
        const errorMsg = `Failed to analyze ${account.accountName}: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
      }
    }

    const combinedAnalysis = await analyzeTransactions(allTransactions);

    return {
      success: accountAnalyses.length > 0,
      accounts: accountAnalyses,
      combined: combinedAnalysis,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      accounts: [],
      combined: {
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
        errors: [],
      },
      errors: [`Analysis failed: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}
