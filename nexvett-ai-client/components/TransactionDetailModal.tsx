import { Modal, Stack, Group, Text, Badge, Paper, Divider, Box, ThemeIcon } from "@mantine/core";
import { Calendar, FileText, TrendingDown, TrendingUp, Hash, Building2 } from "lucide-react";
import { Transaction } from "@nexvett-ai/shared";
import { formatCurrency } from "../lib/utils";

interface TransactionDetailModalProps {
    transaction: Transaction | null;
    opened: boolean;
    onClose: () => void;
}

export function TransactionDetailModal({ transaction, opened, onClose }: TransactionDetailModalProps) {
    if (!transaction) return null;

    const isDebit = transaction.type === 'debit';
    const formattedDate = new Date(transaction.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const formattedTime = new Date(transaction.date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group gap="xs">
                    {isDebit ? <TrendingDown size={20} color="#ef4444" /> : <TrendingUp size={20} color="#22c55e" />}
                    <Text fw={700} size="lg">Transaction Details</Text>
                </Group>
            }
            size="lg"
            centered
            radius="lg"
            padding="xl"
            styles={{
                header: {
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    padding: "20px 24px",
                    background: "rgba(255,255,255,0.02)"
                },
                body: { padding: "24px" }
            }}
        >
            <Stack gap="md">
                {/* Amount Card */}
                <Paper
                    p="xl"
                    radius="xl"
                    style={{
                        background: isDebit
                            ? "linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.06) 100%)"
                            : "linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.06) 100%)",
                        border: `2px solid ${isDebit ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
                        textAlign: "center",
                        boxShadow: isDebit
                            ? "0 8px 32px rgba(239,68,68,0.15)"
                            : "0 8px 32px rgba(34,197,94,0.15)"
                    }}
                >
                    <Group justify="center" mb="xs">
                        <ThemeIcon
                            size={48}
                            radius="xl"
                            variant="light"
                            color={isDebit ? "red" : "green"}
                            style={{
                                background: isDebit ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)"
                            }}
                        >
                            {isDebit ? <TrendingDown size={24} /> : <TrendingUp size={24} />}
                        </ThemeIcon>
                    </Group>
                    <Text size="xs" tt="uppercase" c="dimmed" fw={700} mb={12} style={{ letterSpacing: "0.1em" }}>
                        {isDebit ? "Amount Debited" : "Amount Credited"}
                    </Text>
                    <Text fw={900} size="3rem" c={isDebit ? "red" : "green"} style={{ letterSpacing: "-0.03em", lineHeight: 1 }}>
                        {isDebit ? "-" : "+"}{formatCurrency(transaction.amount)}
                    </Text>
                    {transaction.balance !== undefined && (
                        <Paper
                            mt="lg"
                            p="md"
                            radius="lg"
                            style={{
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.1)"
                            }}
                        >
                            <Text size="xs" c="dimmed" fw={600} mb={4}>Resulting Balance</Text>
                            <Text size="lg" fw={700} style={{ letterSpacing: "-0.01em" }}>
                                {formatCurrency(transaction.balance)}
                            </Text>
                        </Paper>
                    )}
                </Paper>

                <Divider opacity={0.3} />

                {/* Transaction Info */}
                <Stack gap="md">
                    <Paper
                        p="md"
                        radius="lg"
                        style={{
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.08)"
                        }}
                    >
                        <Group gap="md" wrap="nowrap">
                            <ThemeIcon size={44} radius="md" variant="light" color="violet">
                                <Calendar size={22} />
                            </ThemeIcon>
                            <Box style={{ flex: 1 }}>
                                <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={4} style={{ letterSpacing: "0.05em" }}>Date & Time</Text>
                                <Text size="sm" fw={600}>{formattedDate}</Text>
                                <Text size="xs" c="dimmed" mt={2}>{formattedTime}</Text>
                            </Box>
                        </Group>
                    </Paper>

                    <Paper
                        p="md"
                        radius="lg"
                        style={{
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.08)"
                        }}
                    >
                        <Group gap="md" wrap="nowrap" align="flex-start">
                            <ThemeIcon size={44} radius="md" variant="light" color="violet">
                                <FileText size={22} />
                            </ThemeIcon>
                            <Box style={{ flex: 1 }}>
                                <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={4} style={{ letterSpacing: "0.05em" }}>Description</Text>
                                <Text size="sm" fw={500} style={{ lineHeight: 1.6 }}>{transaction.narration}</Text>
                            </Box>
                        </Group>
                    </Paper>

                    {transaction.reference && (
                        <Paper
                            p="md"
                            radius="lg"
                            style={{
                                background: "rgba(255,255,255,0.02)",
                                border: "1px solid rgba(255,255,255,0.08)"
                            }}
                        >
                            <Group gap="md" wrap="nowrap">
                                <ThemeIcon size={44} radius="md" variant="light" color="violet">
                                    <Hash size={22} />
                                </ThemeIcon>
                                <Box style={{ flex: 1 }}>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={4} style={{ letterSpacing: "0.05em" }}>Reference</Text>
                                    <Text size="sm" fw={500} style={{ fontFamily: "monospace", letterSpacing: "0.02em" }}>{transaction.reference}</Text>
                                </Box>
                            </Group>
                        </Paper>
                    )}

                    {transaction.source && (
                        <Paper
                            p="md"
                            radius="lg"
                            style={{
                                background: "rgba(124,58,237,0.08)",
                                border: "1px solid rgba(124,58,237,0.2)"
                            }}
                        >
                            <Group gap="md" wrap="nowrap">
                                <ThemeIcon size={44} radius="md" variant="light" color="violet">
                                    <Building2 size={22} />
                                </ThemeIcon>
                                <Box style={{ flex: 1 }}>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={4} style={{ letterSpacing: "0.05em" }}>Source</Text>
                                    <Badge variant="filled" color="violet" size="lg" radius="md">{transaction.source}</Badge>
                                </Box>
                            </Group>
                        </Paper>
                    )}
                </Stack>

                {/* Transaction Type Badge */}
                <Paper
                    p="md"
                    radius="lg"
                    style={{
                        background: isDebit
                            ? "rgba(239,68,68,0.08)"
                            : "rgba(34,197,94,0.08)",
                        border: `1px solid ${isDebit ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"}`,
                        textAlign: "center"
                    }}
                >
                    <Badge
                        size="xl"
                        variant="filled"
                        color={isDebit ? "red" : "green"}
                        radius="md"
                        style={{
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            padding: "12px 24px",
                            fontSize: "0.75rem",
                            fontWeight: 800
                        }}
                    >
                        {isDebit ? "💸 Debit Transaction" : "💰 Credit Transaction"}
                    </Badge>
                </Paper>
            </Stack>
        </Modal>
    );
}
