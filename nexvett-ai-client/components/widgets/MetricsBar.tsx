import { Grid, Paper, Text, Group, Box } from "@mantine/core";
import { TrendingUp, TrendingDown, Wallet, Zap } from "lucide-react";
import { AIInsightsButton } from "../Chat/AIInsightsButton";
import { formatCurrency } from "../../lib/utils";

interface MetricsBarProps {
    income: number;
    expenses: number;
    netFlow: number;
    savingsRate?: number;
}

export function MetricsBar({ income, expenses, netFlow, savingsRate }: MetricsBarProps) {
    return (
        <Grid gutter="md">
            <Grid.Col span={{ base: 6, md: 3 }}>
                <Paper p="md" radius="lg" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
                    <Group gap="xs" mb={4}>
                        <TrendingUp size={14} color="#22c55e" />
                        <Text size="xs" tt="uppercase" c="dimmed" fw={700}>Income</Text>
                    </Group>
                    <Text fw={800} size="lg" c="green.4">{formatCurrency(income)}</Text>
                </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 6, md: 3 }}>
                <Paper p="md" radius="lg" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                    <Group gap="xs" mb={4}>
                        <TrendingDown size={14} color="#ef4444" />
                        <Text size="xs" tt="uppercase" c="dimmed" fw={700}>Expenses</Text>
                    </Group>
                    <Text fw={800} size="lg" c="red.4">{formatCurrency(expenses)}</Text>
                </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 6, md: 3 }}>
                <Paper p="md" radius="lg" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)" }}>
                    <Group gap="xs" mb={4}>
                        <Wallet size={14} color="#7c3aed" />
                        <Text size="xs" tt="uppercase" c="dimmed" fw={700}>Net Flow</Text>
                    </Group>
                    <Text fw={800} size="lg" c="violet.4">{formatCurrency(netFlow)}</Text>
                </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 6, md: 3 }}>
                <Paper p="md" radius="lg" style={{ background: "rgba(251,146,60,0.06)", border: "1px solid rgba(251,146,60,0.15)", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <Box>
                        <Group gap="xs" mb={4}>
                            <Zap size={14} color="#fb923c" />
                            <Text size="xs" tt="uppercase" c="dimmed" fw={700}>Savings Rate</Text>
                        </Group>
                        <Text fw={800} size="lg" c="orange.4">{savingsRate !== undefined ? `${savingsRate.toFixed(1)}%` : 'N/A'}</Text>
                    </Box>
                    <Box mt="xs">
                        <AIInsightsButton label="Ask AI" />
                    </Box>
                </Paper>
            </Grid.Col>
        </Grid>
    );
}
