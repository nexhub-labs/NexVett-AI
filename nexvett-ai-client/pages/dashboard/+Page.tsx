import { Badge, Box, Button, Container, Grid, Group, Paper, SimpleGrid, Stack, Text, Title, ThemeIcon } from "@mantine/core";
import { useAuth, RequireAuth } from "../../contexts/AuthContext";
import { useSession } from "../../contexts/SessionContext";
import { BarChart3, FileText, Plus, ShieldCheck, History } from "lucide-react";
import { navigate } from "vike/client/router";
import { useState } from "react";
import { SmartDashboard } from "../../components/SmartDashboard";
import { AccountTransactions } from "../../components/AccountTransactions";
import { MultiFileResults } from "../../components/MultiFileResults";
import { TransactionDetailModal } from "../../components/TransactionDetailModal";

import { AnalysisResult, Transaction } from "@nexvett-ai/shared";
import { formatCurrency } from "../../lib/utils";

function DashboardContent() {
    const { user } = useAuth();
    const {
        parseResult,
        analysisResult,
        accountsAnalysis,
        multiFileResult,
        setIsChatOpen
    } = useSession();

    const userName = user?.email?.split('@')[0] || 'User';
    const [selectedTransaction, setSelectedTransaction] = useState<AnalysisResult['analyzedTransactions'][number] | Transaction | null>(null);
    const [transactionDetailOpen, setTransactionDetailOpen] = useState(false);

    const handleViewInsights = () => {
        setIsChatOpen(true);
    };

    const hasData = !!(parseResult || multiFileResult);

    return (
        <Box>
            {/* Welcome Section */}
            <Stack gap="xl" mb={40}>
                <Box>
                    <Badge variant="light" color="violet" radius="xl" mb="sm">
                        Dashboard
                    </Badge>
                    <Title order={1} style={{ fontSize: "clamp(2rem, 4vw, 2.5rem)", letterSpacing: "-0.03em" }}>
                        Welcome back, <Text span c="violet.5" inherit>{userName}</Text>
                    </Title>
                    <Text c="dimmed" size="lg" mt="xs">
                        Manage your analyses and view your insights.
                    </Text>
                </Box>

                {/* Quick Actions */}
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                    <Paper
                        p="xl"
                        radius="lg"
                        component="button"
                        onClick={() => navigate('/analyze')}
                        style={{
                            background: "rgba(124, 58, 237, 0.1)",
                            border: "1px solid rgba(124, 58, 237, 0.2)",
                            textAlign: "left",
                            transition: "transform 0.2s ease",
                            cursor: "pointer",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                    >
                        <ThemeIcon size={48} radius="md" color="violet" variant="light" mb="md">
                            <Plus size={24} />
                        </ThemeIcon>
                        <Text size="lg" fw={700} c="white" mb={4}>New Analysis</Text>
                        <Text size="sm" c="dimmed">Upload and process a new bank statement.</Text>
                    </Paper>

                    <Paper
                        p="xl"
                        radius="lg"
                        style={{
                            background: "rgba(255, 255, 255, 0.03)",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                            textAlign: "left",
                            cursor: "default",
                        }}
                    >
                        <ThemeIcon size={48} radius="md" color="blue" variant="light" mb="md">
                            <History size={24} />
                        </ThemeIcon>
                        <Text size="lg" fw={700} c="white" mb={4}>Detailed Reviews</Text>
                        <Text size="sm" c="dimmed">View your past statement reviews and history.</Text>
                        <Button
                            variant="subtle"
                            color="blue"
                            size="compact-xs"
                            mt="md"
                            rightSection={<BarChart3 size={14} />}
                            onClick={() => navigate('/reviews')}
                            p={0}
                        >
                            Go to Reviews
                        </Button>
                    </Paper>

                    <Paper
                        p="xl"
                        radius="lg"
                        style={{
                            background: "rgba(255, 255, 255, 0.03)",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                            textAlign: "left",
                        }}
                    >
                        <ThemeIcon size={48} radius="md" color="green" variant="light" mb="md">
                            <ShieldCheck size={24} />
                        </ThemeIcon>
                        <Text size="lg" fw={700} c="white" mb={4}>Account Status</Text>
                        <Text size="sm" c="dimmed">Your account is active and verified.</Text>
                    </Paper>
                </SimpleGrid>
            </Stack>

            {hasData ? (
                <Box>
                    <Title order={3} mb="lg">Recent Analysis</Title>
                    {multiFileResult ? (
                        <MultiFileResults
                            result={multiFileResult}
                            onTransactionClick={(txn) => {
                                setSelectedTransaction(txn);
                                setTransactionDetailOpen(true);
                            }}
                        />
                    ) : parseResult?.accounts && parseResult.accounts.length > 0 ? (
                        <AccountTransactions
                            accounts={parseResult.accounts}
                            accountsAnalysis={accountsAnalysis || undefined}
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
                                name: parseResult?.metadata?.bankName || 'Statement',
                                analysis: analysisResult,
                                transactions: analysisResult.analyzedTransactions || parseResult?.transactions || []
                            }]}
                            onViewInsights={handleViewInsights}
                            onTransactionClick={(txn) => {
                                setSelectedTransaction(txn);
                                setTransactionDetailOpen(true);
                            }}
                        />
                    ) : null}
                </Box>
            ) : (
                <Grid>
                    <Grid.Col span={{ base: 12, md: 8 }}>
                        <Paper
                            p="xl"
                            radius="lg"
                            style={{
                                background: "rgba(255, 255, 255, 0.02)",
                                border: "1px solid rgba(255, 255, 255, 0.06)",
                                minHeight: 300,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}
                        >
                            <div style={{ padding: '2rem', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', marginBottom: '1rem' }}>
                                <BarChart3 size={48} opacity={0.3} />
                            </div>
                            <Title order={3} size="h4" mb="xs">No Recent Activity</Title>
                            <Text c="dimmed" ta="center" maw={400}>
                                Your recent analysis insights will appear here once you process a statement.
                            </Text>
                            <Button variant="light" color="violet" mt="xl" onClick={() => navigate('/analyze')}>
                                Start First Analysis
                            </Button>
                        </Paper>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 4 }}>
                        <Paper
                            p="xl"
                            radius="lg"
                            style={{
                                background: "rgba(255, 255, 255, 0.02)",
                                border: "1px solid rgba(255, 255, 255, 0.06)",
                                height: '100%'
                            }}
                        >
                            <Title order={4} mb="lg">Quick Stats</Title>
                            <Stack>
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">Total Analyses</Text>
                                    <Text fw={700}>0</Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">Statements Parsed</Text>
                                    <Text fw={700}>0</Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">Fees Detected</Text>
                                    <Text fw={700}>{formatCurrency(0)}</Text>
                                </Group>
                            </Stack>
                        </Paper>
                    </Grid.Col>
                </Grid>
            )}

            <TransactionDetailModal
                transaction={selectedTransaction}
                opened={transactionDetailOpen}
                onClose={() => setTransactionDetailOpen(false)}
            />
        </Box>
    );
}

export default function Page() {
    return (
        <RequireAuth>
            <DashboardContent />
        </RequireAuth>
    );
}
