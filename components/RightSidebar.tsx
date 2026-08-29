
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { ChartConfig, LeftPanelTab, AppSettings, UploadedFile, PlotLabels, PlotTheme, PlotVariables } from '../types';
import { 
    X, Moon, Sun, Play, Eye, Upload, FileText, Trash2, Copy, Check, Loader2, Database
} from 'lucide-react';
import RTerminal from './RTerminal/RTerminal';

interface RightSidebarProps {
  activeTab: LeftPanelTab;
  config: ChartConfig;
  setConfig: React.Dispatch<React.SetStateAction<ChartConfig>>;
  appSettings: AppSettings;
  setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  uploadedFiles: UploadedFile[];
  onFileUpload: (files: FileList) => void;
  onFileDelete: (fileId: string) => void;
  onFileView: (file: UploadedFile) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  currentLabels?: PlotLabels;
  currentTheme?: PlotTheme;
  currentVariables?: PlotVariables;
  availableVariables?: string[];
  onApplyChanges?: (labels?: PlotLabels, theme?: PlotTheme, variables?: PlotVariables) => void;
}

// --- Sub-components moved outside for performance (stable references) ---

const PanelSection: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => (
  <div className="border-b border-gray-200 last:border-0">
    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center">
      <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">{title}</h3>
    </div>
    <div className="p-4 space-y-3 bg-white">
      {children}
    </div>
  </div>
);

const ColorInput = ({ label, value, onChange }: { label: string, value: string | undefined, onChange: (val: string) => void }) => (
  <div className="flex items-center justify-between">
    <label className="text-xs text-gray-600 font-medium">{label}</label>
    <div className="flex items-center gap-1.5">
      <input 
        type="text" 
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)}
        className="w-20 px-2 py-1 text-xs border border-gray-300 focus:border-blue-500 outline-none text-right font-mono text-gray-700 bg-white"
        placeholder="default"
        spellCheck={false}
      />
      <div className="relative w-6 h-6 border border-gray-300 overflow-hidden shadow-sm shrink-0 bg-white">
        <input 
          type="color" 
          value={value && /^#[0-9A-F]{6}$/i.test(value) ? value : '#ffffff'} 
          onChange={(e) => onChange(e.target.value)}
          className="absolute -top-2 -left-2 w-10 h-10 p-0 border-0 cursor-pointer"
        />
      </div>
    </div>
  </div>
);

// --- Main RightSidebar Component ---

const RightSidebar: React.FC<RightSidebarProps> = ({ 
  activeTab, 
  config, 
  setConfig, 
  appSettings,
  setAppSettings,
  uploadedFiles,
  onFileUpload,
  onFileDelete,
  onFileView,
  isOpenMobile = false, 
  onCloseMobile,
  currentLabels = {} as PlotLabels,
  currentTheme = {} as PlotTheme,
  currentVariables = {} as PlotVariables,
  availableVariables = [],
  // Fix: explicitly define the signature for the default value of onApplyChanges to ensure correct type inference for callers
  onApplyChanges = (labels?: PlotLabels, theme?: PlotTheme, variables?: PlotVariables) => {},
}) => {
  // Local state to buffer changes before "Run" is clicked
  const [localLabels, setLocalLabels] = useState<PlotLabels>(currentLabels);
  const [localTheme, setLocalTheme] = useState<PlotTheme>(currentTheme);
  const [localVariables, setLocalVariables] = useState<PlotVariables>(currentVariables);

  // Sync local state when external props change (e.g. manual editor saves or AI generation)
  useEffect(() => {
    setLocalLabels(currentLabels);
  }, [JSON.stringify(currentLabels)]);

  useEffect(() => {
    setLocalTheme(currentTheme);
  }, [JSON.stringify(currentTheme)]);

  useEffect(() => {
    setLocalVariables(currentVariables);
  }, [JSON.stringify(currentVariables)]);

  // Detect if there are unapplied changes in the current tab
  const isDirty = useMemo(() => {
    if (activeTab === LeftPanelTab.TEXT) {
      return JSON.stringify(localLabels) !== JSON.stringify(currentLabels);
    }
    if (activeTab === LeftPanelTab.COLOR) {
      return JSON.stringify(localTheme) !== JSON.stringify(currentTheme);
    }
    if (activeTab === LeftPanelTab.AXIS) {
      return JSON.stringify(localVariables) !== JSON.stringify(currentVariables);
    }
    return false;
  }, [activeTab, localLabels, currentLabels, localTheme, currentTheme, localVariables, currentVariables]);

  const handleApply = () => {
    onApplyChanges(localLabels, localTheme, localVariables);
  };

  const handleAppChange = (key: keyof AppSettings, value: any) => {
    setAppSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleLocalLabelChange = (key: keyof PlotLabels, value: string) => {
    setLocalLabels(prev => ({ ...prev, [key]: value }));
  };

  const handleLocalThemeChange = (key: keyof PlotTheme, value: string) => {
    setLocalTheme(prev => ({ ...prev, [key]: value }));
  };

  const handleLocalVariableChange = (key: keyof PlotVariables, value: string) => {
    setLocalVariables(prev => ({ ...prev, [key]: value }));
  };

  // --- Panels ---

  const renderAxisPanel = () => {
    const selectBaseClass = "w-full px-3 py-2 text-xs border border-gray-300 focus:border-blue-600 outline-none bg-white text-gray-800";
    
    const VarSelect = ({ label, value, onChange }: { label: string, value: string | undefined, onChange: (val: string) => void }) => (
      <div>
        <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">{label}</label>
        <select 
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)}
          className={selectBaseClass}
        >
          <option value="">(None / Manual)</option>
          {availableVariables.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
    );

    return (
      <div className="flex flex-col h-full bg-white">
        <PanelSection title="Mappings">
          <div className="space-y-3">
             <VarSelect label="X Axis Variable" value={localVariables.x} onChange={(val) => handleLocalVariableChange('x', val)} />
             <VarSelect label="Y Axis Variable" value={localVariables.y} onChange={(val) => handleLocalVariableChange('y', val)} />
          </div>
        </PanelSection>
        
        <PanelSection title="Aesthetics">
          <div className="space-y-3">
             <VarSelect label="Color Variable" value={localVariables.color} onChange={(val) => handleLocalVariableChange('color', val)} />
             <VarSelect label="Fill Variable" value={localVariables.fill} onChange={(val) => handleLocalVariableChange('fill', val)} />
          </div>
        </PanelSection>

        <PanelSection title="Faceting">
          <div className="space-y-3">
             <VarSelect label="Facet Wrap Variable" value={localVariables.facet} onChange={(val) => handleLocalVariableChange('facet', val)} />
          </div>
        </PanelSection>
      </div>
    );
  };

  const renderTextPanel = () => {
    const inputBaseClass = "w-full px-3 py-2 text-xs border border-gray-300 focus:border-blue-600 focus:ring-0 outline-none bg-white transition-colors placeholder:text-gray-400 text-gray-800";
    return (
      <div className="flex flex-col h-full bg-white">
        <PanelSection title="Titles">
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Main Title</label>
              <textarea
                value={localLabels.title || ''}
                onChange={(e) => handleLocalLabelChange('title', e.target.value)}
                className={`${inputBaseClass} resize-y min-h-[60px]`}
                rows={2}
                placeholder="Chart Title"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Subtitle</label>
              <textarea
                value={localLabels.subtitle || ''}
                onChange={(e) => handleLocalLabelChange('subtitle', e.target.value)}
                className={`${inputBaseClass} resize-y min-h-[40px]`}
                rows={2}
                placeholder="Chart Subtitle"
              />
            </div>
          </div>
        </PanelSection>
        <PanelSection title="Axes">
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">X-Axis Label</label>
              <input
                type="text"
                value={localLabels.x || ''}
                onChange={(e) => handleLocalLabelChange('x', e.target.value)}
                className={inputBaseClass}
                placeholder="e.g. Time, Category"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Y-Axis Label</label>
              <input
                type="text"
                value={localLabels.y || ''}
                onChange={(e) => handleLocalLabelChange('y', e.target.value)}
                className={inputBaseClass}
                placeholder="e.g. Value, Count"
              />
            </div>
          </div>
        </PanelSection>
        <PanelSection title="Legends">
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Color Title</label>
              <input
                type="text"
                value={localLabels.color || ''}
                onChange={(e) => handleLocalLabelChange('color', e.target.value)}
                className={inputBaseClass}
                placeholder="Legend title for color"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Fill Title</label>
              <input
                type="text"
                value={localLabels.fill || ''}
                onChange={(e) => handleLocalLabelChange('fill', e.target.value)}
                className={inputBaseClass}
                placeholder="Legend title for fill"
              />
            </div>
          </div>
        </PanelSection>
        <PanelSection title="Footer">
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Caption</label>
            <textarea
              value={localLabels.caption || ''}
              onChange={(e) => handleLocalLabelChange('caption', e.target.value)}
              className={`${inputBaseClass} resize-y min-h-[50px]`}
              rows={3}
              placeholder="Source or notes..."
            />
          </div>
        </PanelSection>
      </div>
    );
  };

  const renderAppearancePanel = () => {
    return (
      <div className="flex flex-col h-full bg-white">
        <PanelSection title="Legend Layout">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-600 font-medium">Position</label>
            <select 
              value={localTheme.legendPosition || 'right'}
              onChange={(e) => handleLocalThemeChange('legendPosition', e.target.value)}
              className="w-32 px-2 py-1 text-xs border border-gray-300 focus:border-blue-600 outline-none bg-white text-gray-700"
            >
              <option value="right">Right</option>
              <option value="left">Left</option>
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
              <option value="none">Hidden</option>
            </select>
          </div>
        </PanelSection>
        <PanelSection title="Colors & Backgrounds">
          <div className="space-y-3">
            <ColorInput 
              label="Plot Area" 
              value={localTheme.plotBackgroundFill} 
              onChange={(val) => handleLocalThemeChange('plotBackgroundFill', val)} 
            />
            <ColorInput 
              label="Panel Area" 
              value={localTheme.panelBackgroundFill} 
              onChange={(val) => handleLocalThemeChange('panelBackgroundFill', val)} 
            />
          </div>
        </PanelSection>
        <PanelSection title="Grid & Text">
          <div className="space-y-3">
            <ColorInput 
              label="Grid Lines" 
              value={localTheme.gridColor} 
              onChange={(val) => handleLocalThemeChange('gridColor', val)} 
            />
            <ColorInput 
              label="Axis Text" 
              value={localTheme.axisTextColor} 
              onChange={(val) => handleLocalThemeChange('axisTextColor', val)} 
            />
          </div>
        </PanelSection>
      </div>
    );
  };

  const renderSettingsPanel = () => {
    const ThemeOption = ({ active, label, onClick }: { active: boolean, label: string, onClick: () => void }) => (
      <button
        onClick={onClick}
        className={`flex-1 py-1.5 px-2 text-xs border rounded transition-all font-medium ${
          active 
          ? 'bg-blue-600 text-white border-blue-600' 
          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        {label}
      </button>
    );

    return (
      <div className="space-y-6">
        <PanelSection title="View Preferences">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-700 font-medium">Plot Viewer Theme</span>
              </div>
              <div className="flex gap-2">
                <ThemeOption active={appSettings.plotViewTheme === 'default'} label="Default" onClick={() => handleAppChange('plotViewTheme', 'default')} />
                <ThemeOption active={appSettings.plotViewTheme === 'canvas'} label="Canvas" onClick={() => handleAppChange('plotViewTheme', 'canvas')} />
                <ThemeOption active={appSettings.plotViewTheme === 'dark'} label="Dark" onClick={() => handleAppChange('plotViewTheme', 'dark')} />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-700 font-medium">Table Viewer Theme</span>
              </div>
              <div className="flex gap-2">
                <ThemeOption active={appSettings.tableViewTheme === 'standard'} label="Standard" onClick={() => handleAppChange('tableViewTheme', 'standard')} />
                <ThemeOption active={appSettings.tableViewTheme === 'minimal'} label="Minimal" onClick={() => handleAppChange('tableViewTheme', 'minimal')} />
                <ThemeOption active={appSettings.tableViewTheme === 'dark'} label="Dark" onClick={() => handleAppChange('tableViewTheme', 'dark')} />
              </div>
            </div>
          </div>
        </PanelSection>
        <PanelSection title="Editor Preferences">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-700 font-medium">
                <span>Font Size</span>
                <span className="font-mono text-gray-500">{appSettings.editorFontSize}px</span>
              </div>
              <input 
                type="range" min="10" max="24" 
                value={appSettings.editorFontSize}
                onChange={(e) => handleAppChange('editorFontSize', Number(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-700 font-medium">Word Wrap</span>
              <button 
                onClick={() => handleAppChange('editorWordWrap', appSettings.editorWordWrap === 'on' ? 'off' : 'on')}
                className={`w-8 h-4 rounded-full relative transition-colors ${appSettings.editorWordWrap === 'on' ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <div className={`absolute w-3 h-3 bg-white rounded-full top-0.5 transition-transform ${appSettings.editorWordWrap === 'on' ? 'left-[18px]' : 'left-[2px]'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-700 font-medium">Minimap</span>
              <button 
                onClick={() => handleAppChange('showMinimap', !appSettings.showMinimap)}
                className={`w-8 h-4 rounded-full relative transition-colors ${appSettings.showMinimap ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <div className={`absolute w-3 h-3 bg-white rounded-full top-0.5 transition-transform ${appSettings.showMinimap ? 'left-[18px]' : 'left-[2px]'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-700 font-medium">Auto-Save</span>
              <button 
                onClick={() => handleAppChange('autoSave', !appSettings.autoSave)}
                className={`w-8 h-4 rounded-full relative transition-colors ${appSettings.autoSave ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <div className={`absolute w-3 h-3 bg-white rounded-full top-0.5 transition-transform ${appSettings.autoSave ? 'left-[18px]' : 'left-[2px]'}`} />
              </button>
            </div>
          </div>
        </PanelSection>
        <PanelSection title="Code Tab Theme">
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => handleAppChange('theme', 'light')}
              className={`flex flex-col items-center justify-center p-3 border rounded transition-all ${appSettings.theme === 'light' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
            >
              <Sun className="w-4 h-4 mb-2" />
              <span className="text-[10px] font-bold uppercase">Light</span>
            </button>
            <button 
              onClick={() => handleAppChange('theme', 'dark')}
              className={`flex flex-col items-center justify-center p-3 border rounded transition-all ${appSettings.theme === 'dark' ? 'bg-gray-800 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
            >
              <Moon className="w-4 h-4 mb-2" />
              <span className="text-[10px] font-bold uppercase">Dark</span>
            </button>
          </div>
        </PanelSection>
      </div>
    );
  };

  const renderDataPanel = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [copiedPath, setCopiedPath] = useState<string | null>(null);

    const handleUploadClick = () => fileInputRef.current?.click();
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) {
        onFileUpload(event.target.files);
        event.target.value = '';
      }
    };
    const copyToClipboard = (path: string) => {
      navigator.clipboard.writeText(path);
      setCopiedPath(path);
      setTimeout(() => setCopiedPath(null), 2000);
    };
    const formatBytes = (bytes: number, decimals = 2) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    return (
      <div className="flex flex-col h-full bg-white">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept=".csv,.tsv,.txt,.dat" className="hidden" />
        <div className="p-4 border-b border-gray-200 bg-gray-50/50">
          <button onClick={handleUploadClick} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-gray-900 text-white rounded hover:bg-gray-800 transition-all focus:outline-none">
            <Upload className="w-3.5 h-3.5" /> Upload Datasets
          </button>
          <p className="text-[10px] text-gray-400 mt-2 text-center uppercase tracking-wide">Supported: CSV, TSV, TXT</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {uploadedFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-6">
              <Database className="w-8 h-8 mb-3 opacity-20" />
              <p className="font-medium text-sm">No Datasets</p>
              <p className="text-xs mt-1 max-w-[150px]">Upload files to reference them in your R code.</p>
            </div>
          ) : (
            <div className="space-y-0 divide-y divide-gray-100">
              {uploadedFiles.map(file => (
                <div key={file.id} className="p-3 hover:bg-blue-50/30 transition-colors group">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="bg-gray-100 p-1.5 rounded text-gray-500"><FileText className="w-4 h-4" /></div>
                      <div className="flex flex-col min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">{file.name}</p>
                        <p className="text-[10px] text-gray-400">{formatBytes(file.size)}</p>
                      </div>
                    </div>
                    <div className="flex items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onFileView(file)} disabled={!file.mountPath} className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors disabled:opacity-50" title="View Data"><Eye className="w-3.5 h-3.5" /></button>
                      <button onClick={() => onFileDelete(file.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  {file.mountPath ? (
                    <div className="bg-gray-50 border border-gray-200 pl-2 pr-1 py-1 rounded flex items-center justify-between gap-2">
                      <code className="text-[10px] text-gray-600 font-mono truncate">{file.mountPath}</code>
                      <button onClick={() => copyToClipboard(file.mountPath as string)} className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors">
                        {copiedPath === file.mountPath ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  ) : (
                    <div className="text-[10px] text-yellow-600 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin"/><span>Mounting...</span></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const mobileClasses = isOpenMobile 
    ? "fixed inset-0 z-50 transform translate-y-0 opacity-100" 
    : "fixed inset-0 z-50 transform translate-y-full opacity-0 pointer-events-none";

  const desktopClasses = `lg:relative w-full lg:border-l lg:border-gray-200 lg:flex lg:flex-col lg:h-full lg:shadow-[0_0_15px_rgba(0,0,0,0.02)] lg:z-10 lg:transform-none lg:opacity-100 lg:pointer-events-auto`;

  return (
    <aside className={`bg-white transition-all duration-300 ease-in-out ${mobileClasses} ${desktopClasses}`}>
      
      {/* Mobile Header with Close Button */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/80 backdrop-blur-sm sticky top-0 z-20">
         <div className="flex flex-col">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Edit</span>
            <span className="text-lg font-bold text-gray-900">
               {activeTab === LeftPanelTab.TEXT && 'Typography'}
               {activeTab === LeftPanelTab.COLOR && 'Appearance'}
               {activeTab === LeftPanelTab.AXIS && 'Axis Select'}
               {activeTab === LeftPanelTab.SETTINGS && 'Configuration'}
               {activeTab === LeftPanelTab.DATA && 'Data Source'}
               {activeTab === LeftPanelTab.TERMINAL && 'R Terminal'}
            </span>
         </div>
         <div className="flex items-center gap-2">
            {(activeTab === LeftPanelTab.TEXT || activeTab === LeftPanelTab.COLOR || activeTab === LeftPanelTab.AXIS) && (
                <button 
                  onClick={handleApply}
                  className={`flex items-center gap-2 px-4 py-2 text-white text-xs font-bold rounded shadow-sm transition-colors ${isDirty ? 'bg-blue-600' : 'bg-gray-400'}`}
                >
                  <Play className="w-3 h-3 fill-current" />
                  Run {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                </button>
            )}
            <button onClick={onCloseMobile} className="p-2 bg-white rounded-full shadow-sm border border-gray-200 text-gray-500 hover:text-gray-900">
                <X className="w-5 h-5" />
            </button>
         </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block p-3 border-b border-gray-200 bg-gray-50" hidden={activeTab === LeftPanelTab.TERMINAL || activeTab === LeftPanelTab.DATA}>
        <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                {activeTab === LeftPanelTab.TEXT && 'Typography'}
                {activeTab === LeftPanelTab.COLOR && 'Appearance'}
                {activeTab === LeftPanelTab.AXIS && 'Axis Select'}
                {activeTab === LeftPanelTab.SETTINGS && 'Configuration'}
            </h2>
            {(activeTab === LeftPanelTab.TEXT || activeTab === LeftPanelTab.COLOR || activeTab === LeftPanelTab.AXIS) && (
                <button 
                  onClick={handleApply}
                  className={`flex items-center gap-1.5 px-2 py-1 text-white text-[10px] font-bold rounded transition-colors shadow-sm uppercase ${isDirty ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-default'}`}
                  disabled={!isDirty}
                >
                  <Play className="w-3 h-3 fill-current" />
                  Apply & Run
                </button>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-white">
        <div className="h-full overflow-y-auto custom-scrollbar p-0 pb-20 lg:pb-0" hidden={activeTab !== LeftPanelTab.TEXT}>
          {renderTextPanel()}
        </div>
        <div className="h-full overflow-y-auto custom-scrollbar p-0 pb-20 lg:pb-0" hidden={activeTab !== LeftPanelTab.COLOR}>
          {renderAppearancePanel()}
        </div>
        <div className="h-full overflow-y-auto custom-scrollbar p-0 pb-20 lg:pb-0" hidden={activeTab !== LeftPanelTab.AXIS}>
          {renderAxisPanel()}
        </div>
        <div className="h-full overflow-y-auto custom-scrollbar p-0 pb-20 lg:pb-0" hidden={activeTab !== LeftPanelTab.SETTINGS}>
          {renderSettingsPanel()}
        </div>
        <div className="h-full overflow-y-auto custom-scrollbar" hidden={activeTab !== LeftPanelTab.DATA}>
          {renderDataPanel()}
        </div>
        <div className="h-full" hidden={activeTab !== LeftPanelTab.TERMINAL}>
          <RTerminal />
        </div>
      </div>
    </aside>
  );
};

export default RightSidebar;
