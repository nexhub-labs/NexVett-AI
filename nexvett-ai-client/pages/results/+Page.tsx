import { ActionIcon, Badge, Button, Divider, Grid, Group, Modal, Paper, ScrollArea, Stack, Text, TextInput, Title, Tooltip, CopyButton, Alert, Box, Pagination, Table, ThemeIcon } from "@mantine/core";
import { ArrowLeft, Sparkles, Send, Copy, Check, Share, Clock, Calendar, TrendingDown, TrendingUp } from "lucide-react";
import { useReducedMotion } from "@mantine/hooks";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { AccountTransactions } from "../../components/AccountTransactions";
import { TransactionDetailModal } from "../../components/TransactionDetailModal";
import { MultiFileUnifiedView } from "../../components/MultiFileUnifiedView";
import { useSession } from "../../contexts/SessionContext";
import { RequireAuth } from "../../contexts/AuthContext";
import { useEffect, useMemo, useRef, useState } from "react";
import { navigate } from "vike/client/router";
import { SmartDashboard } from "../../components/SmartDashboard";
import {
  AccountsAnalysisResult,
  AnalysisResult,
  AccountData,
  ParseResult,
  Transaction,
  MultiFileAnalysisResult
} from "@nexvett-ai/shared";

gsap.registerPlugin(useGSAP);


function ResultsContent() {
  const reducedMotion = useReducedMotion();
  const {
    parseResult,
    analysisResult,
    accountsAnalysis,
    multiFileResult,

    messages: agentMessages,
    setMessages: setAgentMessages,
    analysisContext: savedAnalysisContext,
    setAnalysisContext
  } = useSession();

  const [selectedTransaction, setSelectedTransaction] = useState<AnalysisResult['analyzedTransactions'][number] | Transaction | null>(null);
  const [transactionDetailOpen, setTransactionDetailOpen] = useState(false);
  const { setIsChatOpen } = useSession();

  useEffect(() => {
    // Redirect if no data (either single-file or multi-file)
    if (!parseResult && !multiFileResult) {
      navigate('/analyze');
    }
  }, [parseResult, multiFileResult]);

  const agentContext = useMemo(() => {
    if (!parseResult || !analysisResult) return savedAnalysisContext || "";

    const contextData: Record<string, unknown> = {
      statement: {
        bankName: parseResult.metadata?.bankName || null,
        totalTransactions: parseResult.summary?.totalTransactions || null,
        totalDebit: parseResult.summary?.totalDebit || null,
        totalCredit: parseResult.summary?.totalCredit || null,
        dateRange: parseResult.summary?.dateRange || null,
      },
      insights: {
        summary: analysisResult.summary,
        feeAudit: analysisResult.feeAudit,
        categoryBreakdownTop: analysisResult.categoryBreakdown.slice(0, 8),
        unusualTransactions: analysisResult.patternInsights.unusualTransactions,
      },
    };

    if (parseResult.accounts && parseResult.accounts.length > 0) {
      contextData.accounts = parseResult.accounts.map((acc) => ({
        name: acc.accountName,
        transactionCount: acc.transactions.length,
        totalDebit: acc.summary?.totalDebit || 0,
        totalCredit: acc.summary?.totalCredit || 0,
      }));
    }

    if (accountsAnalysis && accountsAnalysis.accounts.length > 0) {
      contextData.accountInsights = accountsAnalysis.accounts.map((acc) => ({
        accountName: acc.accountName,
        totalIncome: acc.analysis.summary.totalIncome,
        totalExpenses: acc.analysis.summary.totalExpenses,
        netFlow: acc.analysis.summary.netFlow,
        hiddenFees: acc.analysis.feeAudit.totalHiddenFees,
        topCategories: acc.analysis.categoryBreakdown.slice(0, 3).map((cat) => ({
          category: cat.category,
          amount: cat.totalAmount,
        })),
      }));
    }

    const context = JSON.stringify(contextData, null, 2);
    return context;
  }, [analysisResult, parseResult, accountsAnalysis, savedAnalysisContext]);

  useEffect(() => {
    if (agentContext && agentContext !== savedAnalysisContext) {
      setAnalysisContext(agentContext);
    }
  }, [agentContext, savedAnalysisContext, setAnalysisContext]);

  const handleViewInsights = () => {
    setIsChatOpen(true);
  };

  useGSAP(
    () => {
      if (reducedMotion) return;
      const blocks = gsap.utils.toArray("[data-anim='block']");
      gsap.fromTo(
        blocks,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power2.out" }
      );
    },
    { dependencies: [parseResult, analysisResult] }
  );

  if (!parseResult || !analysisResult) {
    return (
      <Stack align="center" justify="center" h="100vh">
        <Text>Loading results...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap={24} pb={40}>
      <Group justify="space-between" align="center" wrap="wrap">
        <Group gap="sm">
          <ActionIcon
            variant="light"
            color="violet"
            radius="xl"
            size="lg"
            onClick={() => navigate('/analyze')}
          >
            <ArrowLeft size={18} />
          </ActionIcon>
          <Title order={1} size="2.5rem" style={{ letterSpacing: "-0.04em", fontWeight: 800 }}>
            Analysis Results
          </Title>
        </Group>
        <Badge variant="light" color="violet" radius="xl" size="lg">
          {parseResult.metadata?.bankName || "Bank Statement"}
        </Badge>
      </Group>



      {/* Content Rendering */}
      {/* Content Rendering */}
      {multiFileResult ? (
        <MultiFileUnifiedView
          result={multiFileResult}
          onTransactionClick={(txn) => {
            setSelectedTransaction(txn);
            setTransactionDetailOpen(true);
          }}
        />
      ) : parseResult?.accounts && parseResult.accounts.length > 0 ? (
        <AccountTransactions
          accounts={parseResult.accounts}
          accountsAnalysis={(accountsAnalysis as AccountsAnalysisResult | null) || undefined}
          onViewInsights={handleViewInsights}
          onTransactionClick={(txn) => {
            setSelectedTransaction(txn);
            setTransactionDetailOpen(true);
          }}
        />
      ) : analysisResult ? (
        <SmartDashboard
          aggregateAnalysis={{
            ...analysisResult,
            summary: {
              ...analysisResult.summary,
              savingsRate: analysisResult.summary.totalIncome > 0
                ? ((analysisResult.summary.totalIncome - analysisResult.summary.totalExpenses) / analysisResult.summary.totalIncome) * 100
                : 0
            }
          }}
          items={[{
            id: 'single-file',
            name: parseResult.metadata?.bankName || 'Statement',
            analysis: analysisResult,
            transactions: analysisResult.analyzedTransactions || parseResult.transactions
          }]}
          onViewInsights={handleViewInsights}
          onTransactionClick={(txn) => {
            setSelectedTransaction(txn);
            setTransactionDetailOpen(true);
          }}
        />
      ) : null}




      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        opened={transactionDetailOpen}
        onClose={() => setTransactionDetailOpen(false)}
      />
    </Stack>
  );
}

export default function Page() {
  return (
    <RequireAuth>
      <ResultsContent />
    </RequireAuth>
  );
}
