import { SmartDashboard } from "./SmartDashboard";
import { AccountData, AnalysisResult, AccountAnalysis, AccountsAnalysisResult } from "@nexvett-ai/shared";
import { Transaction } from "@nexvett-ai/shared";

export function AccountTransactions({
  accounts,
  accountsAnalysis,
  onViewInsights,
  onTransactionClick,
}: {
  accounts: AccountData[];
  accountsAnalysis?: AccountsAnalysisResult;
  onViewInsights?: () => void;
  onTransactionClick?: (transaction: Transaction) => void;
}) {

  if (accounts.length === 0) {
    return null;
  }

  // 1. Calculate Aggregate Analysis (Simple Summation)
  const totalIncome = accounts.reduce((sum, acc) => sum + (acc.summary?.totalCredit || 0), 0);
  const totalExpenses = accounts.reduce((sum, acc) => sum + (acc.summary?.totalDebit || 0), 0);
  const netFlow = totalIncome - totalExpenses;

  // Aggregate category breakdown from all accounts' analyses
  const allCategories: Record<string, { count: number; totalAmount: number }> = {};
  accountsAnalysis?.accounts.forEach(analysis => {
    analysis.analysis.categoryBreakdown?.forEach(cat => {
      if (!allCategories[cat.category]) {
        allCategories[cat.category] = { count: 0, totalAmount: 0 };
      }
      allCategories[cat.category].count += cat.count;
      allCategories[cat.category].totalAmount += cat.totalAmount;
    });
  });

  const totalSpending = Object.values(allCategories).reduce((sum, cat) => sum + cat.totalAmount, 0);
  const aggregateCategoryBreakdown = Object.entries(allCategories)
    .map(([category, data]) => ({
      category,
      count: data.count,
      totalAmount: data.totalAmount,
      percentage: totalSpending > 0 ? (data.totalAmount / totalSpending) * 100 : 0
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  const aggregateAnalysis: AnalysisResult = {
    success: true,
    analyzedTransactions: [] as AnalysisResult['analyzedTransactions'],
    merchantSummary: [] as AnalysisResult['merchantSummary'],
    errors: [] as string[],
    summary: {
      totalTransactions: accounts.reduce((sum, acc) => sum + (acc.summary?.totalTransactions || 0), 0),
      totalIncome,
      totalExpenses,
      netFlow,
      savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0
    },
    feeAudit: { totalHiddenFees: 0, feeCount: 0, feeBreakdown: [], recommendations: [] },
    categoryBreakdown: aggregateCategoryBreakdown,
    patternInsights: {
      recurringTransactions: [],
      unusualTransactions: [],
      incomeVsExpense: { averageMonthlyIncome: 0, averageMonthlyExpenses: 0 }
    }
  };

  // 2. Map items to SmartDashboard format
  const items = accounts.map(account => {
    const fullAnalysis = accountsAnalysis?.accounts.find(a => a.accountName === account.accountName)?.analysis;

    const analysis: AnalysisResult = fullAnalysis || {
      success: true,
      analyzedTransactions: [] as AnalysisResult['analyzedTransactions'],
      merchantSummary: [] as AnalysisResult['merchantSummary'],
      errors: [] as string[],
      summary: {
        totalTransactions: account.summary?.totalTransactions || 0,
        totalIncome: account.summary?.totalCredit || 0,
        totalExpenses: account.summary?.totalDebit || 0,
        netFlow: (account.summary?.totalCredit || 0) - (account.summary?.totalDebit || 0),
        savingsRate: 0
      },
      categoryBreakdown: [],
      feeAudit: { totalHiddenFees: 0, feeCount: 0, feeBreakdown: [], recommendations: [] },
      patternInsights: {
        recurringTransactions: [],
        unusualTransactions: [],
        incomeVsExpense: { averageMonthlyIncome: 0, averageMonthlyExpenses: 0 }
      }
    };

    return {
      id: account.accountName,
      name: account.accountName,
      analysis,
      transactions: fullAnalysis?.analyzedTransactions || account.transactions
    };
  });

  return (
    <SmartDashboard
      aggregateAnalysis={aggregateAnalysis}
      items={items}
      onViewInsights={onViewInsights}
      onTransactionClick={onTransactionClick}
    />
  );
}
