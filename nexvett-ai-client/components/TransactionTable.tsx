import { ActionIcon, Badge, Group, Pagination, Paper, SegmentedControl, Stack, Text, TextInput, ThemeIcon } from "@mantine/core";
import { Transaction } from "@nexvett-ai/shared";
import { Search, TrendingDown, TrendingUp, X } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "../lib/utils";

export type DisplayTransaction = Transaction & {
    normalizedCategory?: string;
    isHiddenFee?: boolean;
    merchantName?: string;
    subCategory?: string;
};

interface TransactionTableProps {
    transactions: DisplayTransaction[];
    limit?: number;
    onTransactionClick?: (transaction: DisplayTransaction) => void;
}

// Full-featured transaction table with pagination, search, and filters
export function TransactionTable({
    transactions,
    limit = 10,
    onTransactionClick
}: TransactionTableProps) {
    const [page, setPage] = useState(1);
    const [typeFilter, setTypeFilter] = useState<'all' | 'debit' | 'credit'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const pageSize = limit;

    // Filter transactions
    const filteredTransactions = transactions.filter(txn => {
        const matchesType = typeFilter === 'all' || txn.type === typeFilter;
        const matchesSearch = searchQuery === '' ||
            txn.narration.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (txn.normalizedCategory && txn.normalizedCategory.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesType && matchesSearch;
    });

    // Reset page when filters change
    const handleFilterChange = (value: string) => {
        setTypeFilter(value as 'all' | 'debit' | 'credit');
        setPage(1);
    };

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setPage(1);
    };

    const totalPages = Math.ceil(filteredTransactions.length / pageSize);
    const paginated = filteredTransactions.slice((page - 1) * pageSize, page * pageSize);

    return (
        <Stack gap="md">
            <Group justify="space-between" wrap="wrap">
                <Text fw={700} c="dimmed" tt="uppercase" size="xs" style={{ letterSpacing: '0.05em' }}>
                    Transaction History
                </Text>

                <Group gap="xs">
                    <TextInput
                        placeholder="Search..."
                        size="xs"
                        leftSection={<Search size={14} />}
                        rightSection={
                            searchQuery && (
                                <ActionIcon size="xs" variant="transparent" c="dimmed" onClick={() => handleSearchChange('')}>
                                    <X size={12} />
                                </ActionIcon>
                            )
                        }
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        style={{ width: 200 }}
                    />
                    <SegmentedControl
                        size="xs"
                        value={typeFilter}
                        onChange={handleFilterChange}
                        data={[
                            { label: 'All', value: 'all' },
                            { label: 'Income', value: 'credit' },
                            { label: 'Expenses', value: 'debit' },
                        ]}
                    />
                </Group>
            </Group>

            <Group justify="space-between" align="center">
                <Text size="xs" c="dimmed">
                    Showing {paginated.length} of {filteredTransactions.length}
                </Text>
                {totalPages > 1 && (
                    <Pagination total={totalPages} value={page} onChange={setPage} size="sm" radius="xl" color="violet" />
                )}
            </Group>

            {paginated.length === 0 ? (
                <Paper p="xl" radius="md" style={{ background: "rgba(255,255,255,0.02)", textAlign: 'center' }}>
                    <Text size="sm" c="dimmed">No transactions match your filters</Text>
                </Paper>
            ) : (
                <Stack gap={4}>
                    {paginated.map((txn, idx) => (
                        <Paper
                            key={idx}
                            p="md"
                            radius="md"
                            style={{
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.05)",
                                cursor: onTransactionClick ? 'pointer' : 'default',
                                transition: 'all 0.2s ease'
                            }}
                            onClick={() => onTransactionClick?.(txn)}
                            onMouseEnter={(e) => {
                                if (onTransactionClick) {
                                    e.currentTarget.style.background = 'rgba(124, 58, 237, 0.1)';
                                    e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.2)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                            }}
                        >
                            <Group justify="space-between" wrap="nowrap" align="center">
                                <Group gap="md" style={{ overflow: 'hidden' }}>
                                    <ThemeIcon
                                        size="lg"
                                        radius="xl"
                                        variant="light"
                                        color={txn.type === 'debit' ? 'red' : 'teal'}
                                    >
                                        {txn.type === 'debit' ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
                                    </ThemeIcon>

                                    <Stack gap={2}>
                                        <Group gap="xs">
                                            <Text size="sm" fw={700} c="white" lineClamp={1} style={{ maxWidth: 350 }}>
                                                {txn.narration}
                                            </Text>
                                            {txn.normalizedCategory && (
                                                <Badge size="xs" variant="gradient" gradient={{ from: 'violet', to: 'cyan' }} style={{ textTransform: 'capitalize' }}>
                                                    {txn.normalizedCategory}
                                                </Badge>
                                            )}
                                        </Group>
                                        <Text size="xs" c="dimmed" fw={500}>
                                            {new Date(txn.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                        </Text>
                                    </Stack>
                                </Group>

                                <Text
                                    size="md"
                                    fw={800}
                                    c={txn.type === 'debit' ? 'red.3' : 'teal.3'}
                                    style={{ whiteSpace: 'nowrap', letterSpacing: '-0.5px' }}
                                >
                                    {txn.type === 'debit' ? '-' : '+'}{formatCurrency(txn.amount)}
                                </Text>
                            </Group>
                        </Paper>
                    ))}
                </Stack>
            )}

            {totalPages > 1 && (
                <Group justify="flex-end">
                    <Pagination total={totalPages} value={page} onChange={setPage} size="sm" radius="xl" color="violet" />
                </Group>
            )}
        </Stack>
    );
}
