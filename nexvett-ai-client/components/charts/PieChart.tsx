import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Paper, Text } from '@mantine/core';
import { formatCurrency } from '../../lib/utils';

interface PieChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  title?: string;
  height?: number;
}

const COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6'];

export function PieChart({ data, title, height = 300 }: PieChartProps) {
  const chartData = data.map((item, index) => ({
    ...item,
    color: item.color || COLORS[index % COLORS.length],
  }));

  return (
    <Paper p="md" radius="lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {title && (
        <Text size="sm" fw={700} mb="md" style={{ letterSpacing: '-0.01em' }}>
          {title}
        </Text>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPie>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'rgba(0,0,0,0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
            }}
            itemStyle={{ color: '#fff' }}
            labelStyle={{ color: '#fff' }}
            formatter={(value: number) => formatCurrency(value)}
          />
          <Legend />
        </RechartsPie>
      </ResponsiveContainer>
    </Paper>
  );
}
