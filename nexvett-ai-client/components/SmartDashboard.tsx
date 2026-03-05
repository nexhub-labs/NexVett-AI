import { Badge, Box, Collapse, Group, Paper, Stack, Text, ActionIcon, Divider } from "@mantine/core";
import { TransactionTable, DisplayTransaction } from "./TransactionTable";
import { MetricsBar } from "./widgets/MetricsBar";
import { CategoryWidget } from "./widgets/CategoryWidget";
import { AIInsightsButton } from "./Chat/AIInsightsButton";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { AnalysisResult, Transaction } from "@nexvett-ai/shared";
import { formatCurrency } from "../lib/utils";

// Transaction interface imported from TransactionTable

interface AnalysisItem {
    id: string;
    name: string;
    analysis: AnalysisResult;
    transactions?: DisplayTransaction[];
}

interface SmartDashboardProps {
    aggregateAnalysis: AnalysisResult;
    items: AnalysisItem[];
    onViewInsights?: () => void;
    onTransactionClick?: (transaction: Transaction) => void;
}

// Collapsible card for each source (account/file)
function SourceCard({
    item,
    defaultOpen = false,
    onTransactionClick
}: {
    item: AnalysisItem;
    defaultOpen?: boolean;
    onTransactionClick?: (transaction: Transaction) => void;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const summary = item.analysis?.summary || {};
    const income = summary.totalIncome || 0;
    const expenses = summary.totalExpenses || 0;
    const netFlow = summary.netFlow || (income - expenses);
    const transactionCount = item.transactions?.length || 0;

    return (
        <Paper
            radius="lg"
            style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.08)",
                overflow: "hidden"
            }}
        >
            {/* Header - Always visible */}
            <Group
                justify="space-between"
                p="md"
                style={{ cursor: "pointer" }}
                onClick={() => setIsOpen(!isOpen)}
            >
                <Group gap="md">
                    <Box
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: netFlow >= 0 ? '#22c55e' : '#ef4444'
                        }}
                    />
                    <Stack gap={2}>
                        <Text size="md" fw={700}>{item.name}</Text>
                        <Text size="xs" c="dimmed">{transactionCount} transactions</Text>
                    </Stack>
                </Group>

                <Group gap="lg">
                    {/* Quick Metrics */}
                    <Group gap="xl" visibleFrom="sm">
                        <Stack gap={0} align="flex-end">
                            <Text size="10px" tt="uppercase" c="dimmed" fw={600}>Income</Text>
                            <Text size="sm" fw={700} c="green.4">{formatCurrency(income)}</Text>
                        </Stack>
                        <Stack gap={0} align="flex-end">
                            <Text size="10px" tt="uppercase" c="dimmed" fw={600}>Expenses</Text>
                            <Text size="sm" fw={700} c="red.4">{formatCurrency(expenses)}</Text>
                        </Stack>
                        <Stack gap={0} align="flex-end">
                            <Text size="10px" tt="uppercase" c="dimmed" fw={600}>Net</Text>
                            <Text size="sm" fw={700} c={netFlow >= 0 ? "green.4" : "red.4"}>
                                {netFlow >= 0 ? '+' : ''}{formatCurrency(netFlow)}
                            </Text>
                        </Stack>
                    </Group>

                    <ActionIcon variant="subtle" size="lg" color="gray">
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </ActionIcon>
                </Group>
            </Group>

            {/* Expandable Content */}
            <Collapse in={isOpen}>
                <Divider color="rgba(255,255,255,0.06)" />
                <Box p="md">
                    {/* Category Breakdown for this source */}
                    {item.analysis?.categoryBreakdown && item.analysis.categoryBreakdown.length > 0 && (
                        <CategoryWidget
                            categories={item.analysis.categoryBreakdown}
                            title={`${item.name} Spending`}
                            limit={5}
                            type="combined"
                        />
                    )}

                    {/* Transaction List */}
                    {item.transactions && item.transactions.length > 0 && (
                        <Box mt="lg">
                            <TransactionTable
                                transactions={item.transactions}
                                onTransactionClick={onTransactionClick}
                            />
                        </Box>
                    )}
                </Box>
            </Collapse>
        </Paper>
    );
}


// Main Smart Dashboard component
export function SmartDashboard({
    aggregateAnalysis,
    items,
    onViewInsights,
    onTransactionClick
}: SmartDashboardProps) {

    const hasMultipleSources = items.length > 1;
    const hasSingleSource = items.length === 1;

    return (
        <Stack gap="xl">
            {/* 1. AGGREGATE SUMMARY - Always visible */}
            {aggregateAnalysis?.summary && (
                <MetricsBar
                    income={aggregateAnalysis.summary.totalIncome || 0}
                    expenses={aggregateAnalysis.summary.totalExpenses || 0}
                    netFlow={aggregateAnalysis.summary.netFlow || 0}
                    savingsRate={aggregateAnalysis.summary.savingsRate}
                />
            )}

            {/* 2. AGGREGATE CATEGORY BREAKDOWN - If available */}
            {aggregateAnalysis?.categoryBreakdown && aggregateAnalysis.categoryBreakdown.length > 0 && (
                <CategoryWidget
                    categories={aggregateAnalysis.categoryBreakdown}
                    title="Spending by Category"
                    limit={6}
                    type="combined"
                />
            )}

            {/* 3. SOURCE BREAKDOWN - Collapsible cards for each source */}
            {hasMultipleSources && (
                <Stack gap="md">
                    <Group justify="space-between">
                        <Text size="lg" fw={700}>Account Breakdown</Text>
                        <Group gap="xs">
                            <AIInsightsButton label="Analyze Accounts" />
                            <Badge variant="light" color="violet">{items.length} sources</Badge>
                        </Group>
                    </Group>

                    {items.map((item, idx) => (
                        <SourceCard
                            key={item.id}
                            item={item}
                            defaultOpen={idx === 0}  // First source open by default
                            onTransactionClick={onTransactionClick}
                        />
                    ))}
                </Stack>
            )}

            {/* For single source, show transactions directly */}
            {hasSingleSource && items[0]?.transactions && items[0].transactions.length > 0 && (
                <Paper p="lg" radius="xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <TransactionTable
                        transactions={items[0].transactions}
                        limit={15}
                        onTransactionClick={onTransactionClick}
                    />
                </Paper>
            )}
        </Stack>
    );
}
