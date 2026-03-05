import { Stack, Title, Group, Text, Badge, Divider } from "@mantine/core";
import { Sparkles } from "lucide-react";
import { MetricsBar } from "./MetricsBar";
import { CategoryWidget } from "./CategoryWidget";
import { FeeWidget } from "./FeeWidget";
import { AnalysisResult } from "@nexvett-ai/shared";

interface ResultsDashboardProps {
    analysis: AnalysisResult;
    title?: string;
    onViewInsights?: () => void;
}

export function ResultsDashboard({ analysis, title = "Financial Overview", onViewInsights }: ResultsDashboardProps) {
    if (!analysis) return null;

    const { summary, feeAudit, categoryBreakdown } = analysis;

    return (
        <Stack gap="xl">
            <Group justify="space-between" align="center">
                <Stack gap={2}>
                    <Title order={2} size="1.75rem" style={{ letterSpacing: "-0.03em", fontWeight: 750 }}>
                        {title}
                    </Title>
                    <Text size="sm" c="dimmed">Deterministic analysis of your transaction patterns</Text>
                </Stack>
                {onViewInsights && (
                    <Badge
                        component="button"
                        onClick={onViewInsights}
                        variant="light"
                        color="violet"
                        size="lg"
                        radius="xl"
                        style={{ cursor: 'pointer', border: 'none' }}
                        leftSection={<Sparkles size={14} />}
                    >
                        AI Financial Advice
                    </Badge>
                )}
            </Group>

            <MetricsBar
                income={summary.totalIncome}
                expenses={summary.totalExpenses}
                netFlow={summary.netFlow}
                savingsRate={summary.savingsRate}
            />

            <CategoryWidget categories={categoryBreakdown} />

            <FeeWidget
                totalFees={feeAudit.totalHiddenFees}
                count={feeAudit.feeCount}
                breakdown={feeAudit.feeBreakdown}
            />
        </Stack>
    );
}
