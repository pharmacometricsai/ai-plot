
import { ChartConfig, ChartType, DataPoint, AppSettings } from '../types';
import { 
  PieChart, BarChart3, LayoutDashboard, 
  ScatterChart, LineChart, CandlestickChart, BarChartHorizontal
} from 'lucide-react';

// --- Sample Data Sets ---

export const REVENUE_DATA: DataPoint[] = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 300 },
  { name: 'Mar', value: 600 },
  { name: 'Apr', value: 800 },
  { name: 'May', value: 500 },
  { name: 'Jun', value: 900 },
  { name: 'Jul', value: 700 },
];

export const PIE_DATA: DataPoint[] = [
  { name: 'Direct', value: 400 },
  { name: 'Social', value: 300 },
  { name: 'Organic', value: 300 },
  { name: 'Referral', value: 200 },
];

export const SCATTER_DATA: DataPoint[] = [
  { name: 'A', value: 0, x: 10, y: 30 },
  { name: 'B', value: 0, x: 30, y: 200 },
  { name: 'C', value: 0, x: 45, y: 100 },
  { name: 'D', value: 0, x: 50, y: 400 },
  { name: 'E', value: 0, x: 70, y: 150 },
  { name: 'F', value: 0, x: 100, y: 250 },
];

export const HISTOGRAM_DATA: DataPoint[] = [
  { name: '0-10', value: 5 },
  { name: '11-20', value: 12 },
  { name: '21-30', value: 25 },
  { name: '31-40', value: 18 },
  { name: '41-50', value: 8 },
  { name: '51-60', value: 3 },
];

// Simplified data for boxplot visualization (using range bars or similar in UI)
export const BOXPLOT_DATA: DataPoint[] = [
  { name: 'Group A', value: 0, min: 10, q1: 30, median: 50, q3: 70, max: 90 },
  { name: 'Group B', value: 0, min: 20, q1: 40, median: 60, q3: 80, max: 100 },
  { name: 'Group C', value: 0, min: 5, q1: 25, median: 45, q3: 65, max: 85 },
];

// --- Chart Definitions ---

export const CHART_TYPES = [
  { id: 'general' as ChartType, label: 'General', icon: LayoutDashboard },
  { id: 'bar' as ChartType, label: 'Bar', icon: BarChart3 },
  { id: 'line' as ChartType, label: 'Line', icon: LineChart },
  { id: 'scatter' as ChartType, label: 'Scatter', icon: ScatterChart },
  { id: 'pie' as ChartType, label: 'Pie', icon: PieChart },
  { id: 'histogram' as ChartType, label: 'Histogram', icon: BarChartHorizontal },
  { id: 'boxplot' as ChartType, label: 'Boxplot', icon: CandlestickChart },
];

// --- App Settings Defaults ---

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'light',
  editorFontSize: 14,
  editorWordWrap: 'on',
  showMinimap: false,
  autoSave: false,
  plotViewTheme: 'default',
  tableViewTheme: 'standard',
};

// --- Initial Configurations Factory ---

export const getInitialConfig = (type: ChartType): ChartConfig => {
  const baseConfig = {
    title: 'Chart Title',
    subtitle: 'Chart Subtitle',
    xAxisLabel: 'X Axis',
    yAxisLabel: 'Y Axis',
    color: '#3b82f6',
    showGrid: true,
    gridColor: '#e5e7eb',
    showLegend: true,
    legendPosition: 'bottom' as const,
    enableTooltip: true,
    enableAnimation: true,
    type,
    data: REVENUE_DATA,
  };

  switch (type) {
    case 'general':
      return { ...baseConfig, title: 'Dashboard Overview', data: REVENUE_DATA };
    case 'pie':
      return { ...baseConfig, title: 'Traffic Source', data: PIE_DATA, xAxisLabel: '', yAxisLabel: '' };
    case 'scatter':
      return { ...baseConfig, title: 'Distribution Analysis', data: SCATTER_DATA, xAxisLabel: 'Variable X', yAxisLabel: 'Variable Y' };
    case 'line':
      return { ...baseConfig, title: 'Trend Analysis', data: REVENUE_DATA, xAxisLabel: 'Time', yAxisLabel: 'Value' };
    case 'bar':
      return { ...baseConfig, title: 'Categorical Comparison', data: REVENUE_DATA };
    case 'histogram':
      return { ...baseConfig, title: 'Frequency Distribution', data: HISTOGRAM_DATA, xAxisLabel: 'Bins', yAxisLabel: 'Frequency' };
    case 'boxplot':
      return { ...baseConfig, title: 'Statistical Distribution', data: BOXPLOT_DATA, xAxisLabel: 'Groups', yAxisLabel: 'Value' };
    default:
      return baseConfig;
  }
};


// --- Sample R Code Factory ---

export const getSampleRCode = (type: ChartType): string => {
  const baseCode = `library(ggplot2)
library(dplyr)

# Sample Data (replace with your own)
`;

  switch (type) {
    case 'bar':
      return baseCode + `df <- data.frame(
  category = c('A', 'B', 'C', 'D'),
  value = c(23, 45, 55, 30)
)

# Bar Chart
ggplot(df, aes(x = category, y = value, fill = category)) +
  geom_bar(stat = "identity") +
  labs(title = "Categorical Comparison", x = "X Axis", y = "Y Axis") +
  theme_classic() + theme(plot.title = element_text(size = 20, face = "bold", hjust = 0.5), plot.subtitle = element_text(size = 14, hjust = 0.5), axis.title.x = element_text(size = 12, face = "bold"), axis.title.y = element_text(size = 12, face = "bold"), axis.text.x = element_text(size = 10), axis.text.y = element_text(size = 10), legend.title = element_text(size = 12, face = "bold"), legend.text = element_text(size = 10), plot.caption = element_text(size = 8, face = "italic", hjust = 1), legend.position = "right")
`;
    case 'line':
      return baseCode + `df <- data.frame(
  time = 1:10,
  value = cumsum(rnorm(10))
)

# Line Chart
ggplot(df, aes(x = time, y = value)) +
  geom_line(color = "steelblue", size = 1.5) +
  geom_point(color = "steelblue", size = 3) +
  labs(title = "Trend Analysis", x = "Time", y = "Value") +
  theme_classic() + theme(plot.title = element_text(size = 20, face = "bold", hjust = 0.5), plot.subtitle = element_text(size = 14, hjust = 0.5), axis.title.x = element_text(size = 12, face = "bold"), axis.title.y = element_text(size = 12, face = "bold"), axis.text.x = element_text(size = 10), axis.text.y = element_text(size = 10), legend.title = element_text(size = 12, face = "bold"), legend.text = element_text(size = 10), plot.caption = element_text(size = 8, face = "italic", hjust = 1), legend.position = "right")
`;
    case 'scatter':
      return baseCode + `df <- data.frame(
  x_var = rnorm(100, mean = 50, sd = 10),
  y_var = rnorm(100, mean = 50, sd = 10)
)

# Scatter Plot
ggplot(df, aes(x = x_var, y = y_var)) +
  geom_point(alpha = 0.6, color = "darkgreen") +
  labs(title = "Distribution Analysis", x = "Variable X", y = "Variable Y") +
  theme_classic() + theme(plot.title = element_text(size = 20, face = "bold", hjust = 0.5), plot.subtitle = element_text(size = 14, hjust = 0.5), axis.title.x = element_text(size = 12, face = "bold"), axis.title.y = element_text(size = 12, face = "bold"), axis.text.x = element_text(size = 10), axis.text.y = element_text(size = 10), legend.title = element_text(size = 12, face = "bold"), legend.text = element_text(size = 10), plot.caption = element_text(size = 8, face = "italic", hjust = 1), legend.position = "right")
`;
    case 'pie':
      return baseCode + `df <- data.frame(
  group = c("Group A", "Group B", "Group C", "Group D"),
  value = c(15, 30, 45, 10)
) %>%
  mutate(
    percentage = value / sum(value),
    label_pos = cumsum(percentage) - 0.5 * percentage
  )

# Pie Chart (using a bar chart with polar coordinates)
ggplot(df, aes(x = "", y = percentage, fill = group)) +
  geom_bar(stat = "identity", width = 1) +
  coord_polar("y", start = 0) +
  geom_text(aes(y = label_pos, label = scales::percent(percentage)), color = "white") +
  theme_void() +
  labs(title = "Traffic Source")
`;
    case 'histogram':
      return baseCode + `df <- data.frame(
  values = rnorm(1000, mean = 100, sd = 15)
)

# Histogram
ggplot(df, aes(x = values)) +
  geom_histogram(binwidth = 10, fill = "dodgerblue", color = "white", alpha = 0.8) +
  labs(title = "Frequency Distribution", x = "Bins", y = "Frequency") +
  theme_classic() + theme(plot.title = element_text(size = 20, face = "bold", hjust = 0.5), plot.subtitle = element_text(size = 14, hjust = 0.5), axis.title.x = element_text(size = 12, face = "bold"), axis.title.y = element_text(size = 12, face = "bold"), axis.text.x = element_text(size = 10), axis.text.y = element_text(size = 10), legend.title = element_text(size = 12, face = "bold"), legend.text = element_text(size = 10), plot.caption = element_text(size = 8, face = "italic", hjust = 1), legend.position = "right")
`;
    case 'boxplot':
      return baseCode + `df <- data.frame(
  category = rep(c("Alpha", "Beta", "Gamma"), each = 50),
  value = c(rnorm(50, 75, 10), rnorm(50, 85, 12), rnorm(50, 80, 8))
)

# Boxplot
ggplot(df, aes(x = category, y = value, fill = category)) +
  geom_boxplot() +
  labs(title = "Statistical Distribution", x = "Groups", y = "Value") +
  theme_classic() + theme(plot.title = element_text(size = 20, face = "bold", hjust = 0.5), plot.subtitle = element_text(size = 14, hjust = 0.5), axis.title.x = element_text(size = 12, face = "bold"), axis.title.y = element_text(size = 12, face = "bold"), axis.text.x = element_text(size = 10), axis.text.y = element_text(size = 10), legend.title = element_text(size = 12, face = "bold"), legend.text = element_text(size = 10), plot.caption = element_text(size = 8, face = "italic", hjust = 1), legend.position = "right") +
  theme(legend.position = "none")
`;
    default:
      return `library(ggplot2)

# Welcome to the Output Editor!
# This is a sample script using ggplot2 with the built-in 'mtcars' dataset.
# You can edit this code or create a new project from the sidebar.
first_data <- mtcars
first_data$newCol <- runif(nrow(first_data))
View(first_data)
# Create a scatter plot of car weight vs. miles per gallon
ggplot(first_data, aes(x = wt, y = mpg, color = factor(cyl))) +
  geom_point() +
  labs(
    title = "Fuel Efficiency vs. Car Weight",
    subtitle = "by Number of Cylinders",
    x = "Weight (1000 lbs)",
    y = "Miles Per Gallon (MPG)",
    color = "Cylinders"
  ) +
  theme_classic() +
  theme(plot.title = element_text(size = 20, face = "bold", hjust = 0.5),
    plot.subtitle = element_text(size = 14, hjust = 0.5),
    axis.title.x = element_text(size = 12, face = "bold"),
    axis.title.y = element_text(size = 12, face = "bold"),
    axis.text.x = element_text(size = 10),
    axis.text.y = element_text(size = 10),
    legend.title = element_text(size = 12, face = "bold"),
    legend.text = element_text(size = 10),
    plot.caption = element_text(size = 8, face = "italic", hjust = 1),
    legend.position = "right")
`;
  }
};