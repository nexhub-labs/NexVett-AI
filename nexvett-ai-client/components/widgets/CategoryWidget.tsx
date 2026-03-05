import { Paper, Text, Group, Stack, Progress, Box, Grid } from "@mantine/core";
import { PieChart, BarChart } from "../charts";
import { formatCurrency } from "../../lib/utils";

interface CategoryData {
    category: string;
    totalAmount: number;
    percentage: number;
}

interface CategoryWidgetProps {
    categories: CategoryData[];
    title?: string;
    limit?: number;
    type?: 'chart' | 'list' | 'combined';
}

// Capitalize first letter of each word
const capitalize = (str: string) => str.replace(/\b\w/g, (c) => c.toUpperCase());

export function CategoryWidget({ categories, title = "Spending by Category", limit = 5, type = 'combined' }: CategoryWidgetProps) {
    const data = categories.slice(0, limit);

    return (
        <Paper p="lg" radius="xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Text size="sm" fw={700} mb="xl" style={{ letterSpacing: "-0.01em" }}>{title}</Text>

            <Grid gutter="xl">
                {(type === 'chart' || type === 'combined') && (
                    <Grid.Col span={{ base: 12, md: type === 'combined' ? 6 : 12 }}>
                        <PieChart
                            data={data.map(cat => ({ name: capitalize(cat.category), value: cat.totalAmount }))}
                            height={280}
                        />
                    </Grid.Col>
                )}

                {(type === 'list' || type === 'combined') && (
                    <Grid.Col span={{ base: 12, md: type === 'combined' ? 6 : 12 }}>
                        <Stack gap="md">
                            {data.map((cat, idx) => (
                                <Box key={idx}>
                                    <Group justify="space-between" mb={6}>
                                        <Text size="xs" fw={600}>{capitalize(cat.category)}</Text>
                                        <Text size="xs" c="dimmed">{formatCurrency(cat.totalAmount)} ({cat.percentage.toFixed(1)}%)</Text>
                                    </Group>
                                    <Progress
                                        value={cat.percentage}
                                        size="sm"
                                        radius="xl"
                                        color={idx === 0 ? "violet" : "indigo"}
                                        style={{ background: "rgba(255,255,255,0.05)" }}
                                    />
                                </Box>
                            ))}
                        </Stack>
                    </Grid.Col>
                )}
            </Grid>
        </Paper>
    );
}
