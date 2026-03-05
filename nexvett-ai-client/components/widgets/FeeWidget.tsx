import { Paper, Text, Group, Stack, Badge, Grid, Box } from "@mantine/core";
import { AlertCircle } from "lucide-react";
import { formatCurrency } from "../../lib/utils";

interface FeeData {
    type: string;
    count: number;
    totalAmount: number;
}

interface FeeWidgetProps {
    totalFees: number;
    count: number;
    breakdown: FeeData[];
}

export function FeeWidget({ totalFees, count, breakdown }: FeeWidgetProps) {
    if (totalFees === 0) return null;

    return (
        <Paper p="lg" radius="xl" style={{ background: "rgba(239,68,68,0.03)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <Group justify="space-between" mb="lg">
                <Group gap="xs">
                    <AlertCircle size={18} color="#ef4444" />
                    <Text size="sm" fw={700} c="red.4">Hidden Fees Detected</Text>
                </Group>
                <Badge variant="filled" color="red" size="sm" radius="sm">{formatCurrency(totalFees)}</Badge>
            </Group>

            <Grid gutter="sm">
                {breakdown.map((fee, idx) => (
                    <Grid.Col key={idx} span={{ base: 12, sm: 6, md: 4 }}>
                        <Paper p="sm" radius="md" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)" }}>
                            <Text size="xs" c="dimmed" mb={4}>{fee.type}</Text>
                            <Text fw={700} size="sm">{formatCurrency(fee.totalAmount)}</Text>
                            <Text size="10px" c="dimmed">{fee.count} occurrences</Text>
                        </Paper>
                    </Grid.Col>
                ))}
            </Grid>
        </Paper>
    );
}
