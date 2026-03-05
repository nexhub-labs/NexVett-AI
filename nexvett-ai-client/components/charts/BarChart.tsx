import { BarChart as RechartsBar, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Paper, Text } from '@mantine/core';
import { formatCurrency } from '../../lib/utils';

interface BarChartProps {
  data: Array<{ name: string; value: number;[key: string]: string | number }>;
  title?: string;
  height?: number;
  dataKey?: string;
  color?: string;
}

export function BarChart({ data, title, height = 300, dataKey = 'value', color = '#7c3aed' }: BarChartProps) {
  return (
    <Paper p="md" radius="lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {title && (
        <Text size="sm" fw={700} mb="md" style={{ letterSpacing: '-0.01em' }}>
          {title}
        </Text>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBar data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="name"
            stroke="rgba(255,255,255,0.5)"
            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
          />
          <YAxis
            stroke="rgba(255,255,255,0.5)"
            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
            tickFormatter={(value) => formatCurrency(value, undefined, undefined, { notation: 'compact', maximumFractionDigits: 0 })}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(0,0,0,0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
            }}
            itemStyle={{ color: '#fff' }}
            labelStyle={{ color: '#fff' }}
            formatter={(value: number) => [formatCurrency(value), 'Amount']}
          />
          <Bar dataKey={dataKey} fill={color} radius={[8, 8, 0, 0]} />
        </RechartsBar>
      </ResponsiveContainer>
    </Paper>
  );
}
