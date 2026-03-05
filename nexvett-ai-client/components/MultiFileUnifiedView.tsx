import { Badge, Box, Button, Card, Checkbox, Container, Divider, Grid, Group, Paper, Stack, Text, Title, ThemeIcon, ActionIcon, Tooltip, ScrollArea } from "@mantine/core";
import { FileText, PieChart, TrendingUp, Filter, Check, MoreVertical, Layers, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { SmartDashboard } from "./SmartDashboard";
import { Transaction } from "@nexvett-ai/shared";
import { AnalysisResult, MultiFileAnalysisResult } from "@nexvett-ai/shared";
import { formatCurrency } from "../lib/utils";

interface MultiFileUnifiedViewProps {
    result: MultiFileAnalysisResult;
    onTransactionClick?: (transaction: Transaction) => void;
}

export function MultiFileUnifiedView({ result, onTransactionClick }: MultiFileUnifiedViewProps) {
    const unified = result.unified;
    if (!unified) return null;

    const [selectedFileIds, setSelectedFileIds] = useState<string[]>(
        unified.files.map(f => f.fileId)
    );
    const [viewMode, setViewMode] = useState<'combined' | 'individual'>('combined');
    const [focusedFileId, setFocusedFileId] = useState<string | null>(null);

    // Dynamic Aggregate Calculation
    const dynamicAggregate = useMemo(() => {
        const activeFiles = unified.files.filter(f => selectedFileIds.includes(f.fileId));

        let totalIncome = 0;
        let totalExpenses = 0;
        let totalTransactions = 0;
        const categoriesMap = new Map<string, { totalAmount: number, count: number }>();

        activeFiles.forEach(f => {
            const summary = f.analysis.summary;
            totalIncome += summary.totalIncome;
            totalExpenses += summary.totalExpenses;
            totalTransactions += summary.totalTransactions;

            f.analysis.categoryBreakdown?.forEach((cat) => {
                const existing = categoriesMap.get(cat.category) || { totalAmount: 0, count: 0 };
                categoriesMap.set(cat.category, {
                    totalAmount: existing.totalAmount + cat.totalAmount,
                    count: existing.count + cat.count
                });
            });
        });

        const categoryBreakdown = Array.from(categoriesMap.entries())
            .map(([category, data]) => ({
                category,
                totalAmount: data.totalAmount,
                count: data.count,
                percentage: totalExpenses > 0 ? (data.totalAmount / totalExpenses) * 100 : 0
            }))
            .sort((a, b) => b.totalAmount - a.totalAmount);

        return {
            success: true,
            analyzedTransactions: [],
            feeAudit: { totalHiddenFees: 0, feeCount: 0, feeBreakdown: [], recommendations: [] },
            merchantSummary: [],
            patternInsights: {
                recurringTransactions: [],
                unusualTransactions: [],
                incomeVsExpense: { averageMonthlyIncome: 0, averageMonthlyExpenses: 0 }
            },
            summary: {
                totalIncome,
                totalExpenses,
                netFlow: totalIncome - totalExpenses,
                totalTransactions,
                savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0
            },
            categoryBreakdown,
            errors: []
        } as AnalysisResult;
    }, [selectedFileIds, unified.files]);

    const activeItems = useMemo(() => {
        if (viewMode === 'combined') {
            return unified.files
                .filter(f => selectedFileIds.includes(f.fileId))
                .map(f => ({
                    id: f.fileId,
                    name: f.fileName,
                    analysis: f.analysis,
                    transactions: f.transactions
                }));
        } else {
            const focused = unified.files.find(f => f.fileId === focusedFileId);
            return focused ? [{
                id: focused.fileId,
                name: focused.fileName,
                analysis: focused.analysis,
                transactions: focused.transactions
            }] : [];
        }
    }, [viewMode, focusedFileId, selectedFileIds, unified.files]);

    const toggleFile = (id: string) => {
        setSelectedFileIds(prev =>
            prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
        );
    };

    const isSingleFile = unified.files.length === 1;

    return (
        <Grid gutter="xl">
            {/* Sidebar Control Panel - Only show if multi-file */}
            {!isSingleFile && (
                <Grid.Col span={{ base: 12, md: 3.5 }}>
                    <Stack gap="md" style={{ position: 'sticky', top: 20 }}>
                        <Paper p="xl" radius="xl" style={{
                            background: "rgba(255,255,255,0.015)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            boxShadow: "0 8px 32px rgba(0,0,0,0.2)"
                        }}>
                            <Group justify="space-between" mb="lg">
                                <Title order={4} style={{ letterSpacing: '-0.02em' }}>Unified Analysis</Title>
                                <ThemeIcon variant="light" color="violet" size="md" radius="md">
                                    <Layers size={18} />
                                </ThemeIcon>
                            </Group>

                            <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="md" style={{ letterSpacing: '0.1em' }}>
                                Data Sources ({unified.files.length})
                            </Text>

                            <ScrollArea.Autosize mah={400} type="hover">
                                <Stack gap="xs">
                                    {unified.files.map(file => (
                                        <Paper
                                            key={file.fileId}
                                            p="sm"
                                            radius="lg"
                                            onClick={() => {
                                                setFocusedFileId(file.fileId);
                                                setViewMode('individual');
                                            }}
                                            style={{
                                                background: focusedFileId === file.fileId && viewMode === 'individual'
                                                    ? "rgba(124, 58, 237, 0.12)"
                                                    : "rgba(255,255,255,0.02)",
                                                border: `1px solid ${focusedFileId === file.fileId && viewMode === 'individual' ? "rgba(124, 58, 237, 0.4)" : "rgba(255,255,255,0.06)"}`,
                                                cursor: "pointer",
                                                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                                            }}
                                        >
                                            <Group justify="space-between" wrap="nowrap">
                                                <Group gap="sm" style={{ flex: 1, minWidth: 0 }}>
                                                    <Checkbox
                                                        size="xs"
                                                        radius="sm"
                                                        color="violet"
                                                        checked={selectedFileIds.includes(file.fileId)}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleFile(file.fileId);
                                                        }}
                                                    />
                                                    <Box style={{ flex: 1, minWidth: 0 }}>
                                                        <Text size="sm" fw={700} truncate>{file.fileName}</Text>
                                                        <Text size="10px" c="dimmed">{file.analysis.summary.totalTransactions} txs • {file.metadata?.type?.toUpperCase() || 'FILE'}</Text>
                                                    </Box>
                                                </Group>
                                                <ChevronRight size={16} opacity={0.3} />
                                            </Group>
                                        </Paper>
                                    ))}
                                </Stack>
                            </ScrollArea.Autosize>

                            <Divider my="xl" color="rgba(255,255,255,0.06)" />

                            <Stack gap="sm">
                                <Button
                                    fullWidth
                                    variant={viewMode === 'combined' ? 'filled' : 'light'}
                                    color="violet"
                                    radius="md"
                                    leftSection={<Layers size={16} />}
                                    onClick={() => {
                                        setViewMode('combined');
                                        setFocusedFileId(null);
                                    }}
                                >
                                    Combined View
                                </Button>
                                <Text size="xs" c="dimmed" ta="center">
                                    {selectedFileIds.length} of {unified.files.length} files contributing to totals
                                </Text>
                            </Stack>
                        </Paper>

                        {/* Quick Selection Summary */}
                        <Card p="lg" radius="xl" style={{ background: "rgba(124, 58, 237, 0.05)", border: "1px dashed rgba(124, 58, 237, 0.2)" }}>
                            <Text size="xs" fw={700} c="violet.3" mb="xs">SELECTION SUMMARY</Text>
                            <Stack gap={4}>
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">Income</Text>
                                    <Text size="sm" fw={700}>{formatCurrency(dynamicAggregate.summary.totalIncome)}</Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">Expenses</Text>
                                    <Text size="sm" fw={700}>{formatCurrency(dynamicAggregate.summary.totalExpenses)}</Text>
                                </Group>
                                <Divider my={4} color="rgba(255,255,255,0.05)" />
                                <Group justify="space-between">
                                    <Text size="sm" fw={700}>Net Flow</Text>
                                    <Text size="sm" fw={800} c={dynamicAggregate.summary.netFlow >= 0 ? "green.4" : "red.4"}>
                                        {formatCurrency(dynamicAggregate.summary.netFlow)}
                                    </Text>
                                </Group>
                            </Stack>
                        </Card>
                    </Stack>
                </Grid.Col>
            )}

            {/* Main Content Area */}
            <Grid.Col span={{ base: 12, md: isSingleFile ? 12 : 8.5 }}>
                <Box>
                    <Group justify="space-between" mb="xl">
                        {!isSingleFile && (
                            <Box>
                                <Title order={2} style={{ letterSpacing: '-0.03em' }}>
                                    {viewMode === 'combined' ? 'Combined Analysis' : 'File Detail'}
                                </Title>
                                <Text c="dimmed" size="sm">
                                    {viewMode === 'combined'
                                        ? `Aggregated data from ${selectedFileIds.length} selected sources`
                                        : `In-depth look at ${activeItems[0]?.name}`}
                                </Text>
                            </Box>
                        )}
                        {viewMode === 'individual' && !isSingleFile && (
                            <Button variant="subtle" color="violet" onClick={() => setViewMode('combined')} leftSection={<Filter size={16} />}>
                                Back to Combined
                            </Button>
                        )}
                    </Group>

                    <SmartDashboard
                        aggregateAnalysis={viewMode === 'combined' ? dynamicAggregate : activeItems[0]?.analysis}
                        items={['combined'].includes(viewMode) ? activeItems : []}
                        onTransactionClick={onTransactionClick}
                    />

                    {/* If in individual mode, show the source details directly */}
                    {viewMode === 'individual' && activeItems[0] && !isSingleFile && (
                        <Box mt="xl">
                            <SmartDashboard
                                aggregateAnalysis={activeItems[0].analysis}
                                items={[activeItems[0]]}
                                onTransactionClick={onTransactionClick}
                            />
                        </Box>
                    )}
                </Box>
            </Grid.Col>
        </Grid>
    );
}
