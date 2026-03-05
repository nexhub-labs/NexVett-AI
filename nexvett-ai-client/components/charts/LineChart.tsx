import { LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Paper, Text } from '@mantine/core';
import { formatCurrency } from '../../lib/utils';

interface LineChartProps {
  data: Array<{ name: string;[key: string]: string | number }>;
  lines: Array<{ dataKey: string; color: string; name: string }>;
  title?: string;
  height?: number;
}

export function LineChart({ data, lines, title, height = 300 }: LineChartProps) {
  return (
    <Paper p="md" radius="lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {title && (
        <Text size="sm" fw={700} mb="md" style={{ letterSpacing: '-0.01em' }}>
          {title}
        </Text>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLine data={data}>
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
            formatter={(value: number) => formatCurrency(value)}
          />
          <Legend />
          {lines.map((line) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.color}
              strokeWidth={2}
              name={line.name}
              dot={{ fill: line.color, r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </RechartsLine>
      </ResponsiveContainer>
    </Paper>
  );
}
