import { ChartConfig } from './types';

export const INITIAL_DATA = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 300 },
  { name: 'Mar', value: 600 },
  { name: 'Apr', value: 800 },
  { name: 'May', value: 500 },
  { name: 'Jun', value: 900 },
  { name: 'Jul', value: 700 },
];

export const INITIAL_CONFIG: ChartConfig = {
  title: 'Monthly Revenue',
  subtitle: 'Financial Year 2024',
  xAxisLabel: 'Month',
  yAxisLabel: 'Revenue ($)',
  color: '#3b82f6', // blue-500
  type: 'bar',
  showGrid: true,
  gridColor: '#e5e7eb',
  showLegend: true,
  legendPosition: 'bottom',
  enableTooltip: true,
  enableAnimation: true,
  data: INITIAL_DATA,
};

export const COLORS = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#14b8a6', // Teal
];