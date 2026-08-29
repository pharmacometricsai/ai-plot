
export type ChartType = 
  | 'general'
  | 'scatter' 
  | 'line'
  | 'pie' 
  | 'boxplot'
  | 'bar' 
  | 'histogram';

export interface DataPoint {
  name: string;
  value: number; // Used for Bar, Pie, Line, Area, Histogram
  x?: number;    // Used for Scatter
  y?: number;    // Used for Scatter
  z?: number;    // Used for Bubble (size) - kept for compatibility if needed, though Bubble removed from list
  min?: number;  // For Boxplot simulation
  q1?: number;
  median?: number;
  q3?: number;
  max?: number;
  [key: string]: any;
}

export interface ChartConfig {
  type: ChartType;
  title: string;
  subtitle: string;
  xAxisLabel: string;
  yAxisLabel: string;
  color: string;
  showGrid: boolean;
  gridColor: string;
  // New Visualization Settings
  showLegend: boolean;
  legendPosition: 'top' | 'bottom' | 'left' | 'right';
  enableTooltip: boolean;
  enableAnimation: boolean;
  data: DataPoint[];
}

export interface AppSettings {
  theme: 'light' | 'dark';
  editorFontSize: number;
  editorWordWrap: 'on' | 'off';
  showMinimap: boolean;
  autoSave: boolean;
  // New View Preferences
  plotViewTheme: 'default' | 'canvas' | 'dark';
  tableViewTheme: 'standard' | 'minimal' | 'dark';
}

export interface PlotLabels {
  title?: string;
  subtitle?: string;
  x?: string;
  y?: string;
  caption?: string;
  color?: string; // Often used for Legend Title
  fill?: string;  // Often used for Legend Title
}

export interface PlotTheme {
  legendPosition?: string;
  plotBackgroundFill?: string;
  panelBackgroundFill?: string;
  gridColor?: string;
  axisTextColor?: string;
}

export interface PlotVariables {
  x?: string;
  y?: string;
  color?: string;
  fill?: string;
  facet?: string;
}

export enum LeftPanelTab {
  TEXT = 'TEXT',
  COLOR = 'COLOR',
  AXIS = 'AXIS',
  DATA = 'DATA',
  SETTINGS = 'SETTINGS',
  TERMINAL = 'TERMINAL',
}

export enum CenterViewMode {
  PLOT = 'PLOT',
  CODE = 'CODE',
  RESULT_TABLE = 'RESULT_TABLE',
}

// R Runner Types
export interface ConsoleOutput {
  type: 'stdout' | 'stderr' | 'input' | 'system';
  message: string;
}

export interface Environment {
  [key: string]: {
    class: string[];
    type: string;
    str: string;
    objectType: 'variable' | 'function' | 'data';
    columns?: string[];
  };
}

export interface TableData {
  name: string;
  columns: string[];
  data: Record<string, any>[];
}

export interface PlotData {
  id: string;
  timestamp: number;
  dataUrl: string;
}

export interface UploadedFile {
  id: string; // Use a unique ID for React keys
  name: string;
  size: number;
  type: string;
  content: Uint8Array; // The raw content of the file as bytes
  mountPath: string | null; // The path inside the WebR environment
}


declare global {
  interface Window {
    // Removed WebVM types
  }
}
