
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Header from './components/Header';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import CenterPanel from './components/CenterPanel';
import { ChartConfig, LeftPanelTab, ChartType, AppSettings, CenterViewMode, PlotData, TableData, UploadedFile, PlotLabels, PlotTheme, PlotVariables, Environment } from './types';
import { getInitialConfig, DEFAULT_APP_SETTINGS, getSampleRCode } from './data/defaults';
import eventBus from './utils/eventBus';
import { generateRCode } from './utils/gemini';
import { extractLabelsFromCode, updateCodeWithLabels, extractThemeFromCode, updateCodeWithTheme, extractVariablesFromCode, updateCodeWithVariables } from './utils/codeManipulation';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { Smartphone } from 'lucide-react';


const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LeftPanelTab>(LeftPanelTab.TEXT);
  const [config, setConfig] = useState<ChartConfig>(getInitialConfig('general'));
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  
  // State for Code and View
  const [viewMode, setViewMode] = useState<CenterViewMode>(CenterViewMode.PLOT);
  const [activeCode, setActiveCode] = useState<string>(() => getSampleRCode('general'));
  const [editorContent, setEditorContent] = useState<string>(activeCode);

  // Panel Visibility States
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

  // Mobile specific state
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [showMobileWarning, setShowMobileWarning] = useState(false);

  // Resize logic
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

  // Gemini AI State
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // R Environment State
  const [isRReady, setIsRReady] = useState(false);
  const isInitialRun = useRef(true);
  const [rPlots, setRPlots] = useState<PlotData[]>([]);
  const [rTables, setRTables] = useState<TableData[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [availableVariables, setAvailableVariables] = useState<string[]>([]);

  // Update mobile state on resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    if (window.innerWidth < 1024) {
      setShowMobileWarning(true);
    }
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync editor on code changes
  useEffect(() => {
    setEditorContent(activeCode);
  }, [activeCode]);
  
  // R Ready listener
  useEffect(() => {
    const handleRReady = () => setIsRReady(true);
    eventBus.on('r-ready', handleRReady);
    return () => eventBus.remove('r-ready', handleRReady);
  }, []);

  // R Content listeners
  useEffect(() => {
    const handleRPlot = (data: PlotData) => {
       setRPlots(prev => [...prev, data]);
       setViewMode(CenterViewMode.PLOT);
    };
    const handleRTable = (data: TableData) => {
        setRTables(prev => [...prev, data]);
        setViewMode(CenterViewMode.RESULT_TABLE);
    };
    const handleClear = () => {
      setRPlots([]);
      setRTables([]);
    };
    const handleEnvUpdate = (env: Environment) => {
        const allCols = new Set<string>();
        Object.values(env).forEach(obj => {
            if (obj.columns) obj.columns.forEach(c => allCols.add(c));
        });
        setAvailableVariables(Array.from(allCols));
    };

    eventBus.on('r-plot-created', handleRPlot);
    eventBus.on('r-table-created', handleRTable);
    eventBus.on('clear-r-outputs', handleClear);
    eventBus.on('r-environment-updated', handleEnvUpdate);

    return () => {
        eventBus.remove('r-plot-created', handleRPlot);
        eventBus.remove('r-table-created', handleRTable);
        eventBus.remove('clear-r-outputs', handleClear);
        eventBus.remove('r-environment-updated', handleEnvUpdate);
    };
  }, []);

  // File mount listener
  useEffect(() => {
    const handleFileMounted = (data: { id: string; mountPath: string }) => {
        setUploadedFiles(prevFiles => 
            prevFiles.map(file => 
                file.id === data.id ? { ...file, mountPath: data.mountPath } : file
            )
        );
    };
    eventBus.on('file-mounted', handleFileMounted);
    return () => eventBus.remove('file-mounted', handleFileMounted);
  }, []);

  // Autosave Logic
  useEffect(() => {
    if (!appSettings.autoSave) return;
    const handler = setTimeout(() => {
      if (editorContent !== activeCode && editorContent.trim()) {
        setActiveCode(editorContent);
      }
    }, 1000);
    return () => clearTimeout(handler);
  }, [editorContent, activeCode, appSettings.autoSave]);
  
  // Execution Logic
  useEffect(() => {
    if (!isRReady) return;
    if (isInitialRun.current) {
      if (activeCode.trim()) {
        eventBus.dispatch('run-r-code', { code: activeCode + '\n', source: 'editor' });
      }
      isInitialRun.current = false;
      return;
    }
    if (activeCode.trim()) {
      eventBus.dispatch('run-r-code', { code: activeCode + '\n', source: 'editor' });
    }
  }, [activeCode, isRReady]);
  
  const prevViewModeRef = useRef(viewMode);
  useEffect(() => {
    if (prevViewModeRef.current === CenterViewMode.CODE && viewMode !== CenterViewMode.CODE) {
      if (editorContent !== activeCode) {
        setActiveCode(editorContent);
      }
    }
    prevViewModeRef.current = viewMode;
  }, [viewMode, editorContent, activeCode]);

  /**
   * Manual Save Implementation
   * If labels and theme are provided from the Sidebar, they are merged into the editor content first.
   */
  const handleManualSave = useCallback((labels?: PlotLabels, theme?: PlotTheme, variables?: PlotVariables) => {
    let finalCode = editorContent;

    // Apply sidebar specific changes if they were passed (clicked Run in Sidebar)
    if (labels) {
      finalCode = updateCodeWithLabels(finalCode, labels);
    }
    if (theme) {
      finalCode = updateCodeWithTheme(finalCode, theme);
    }
    if (variables) {
      finalCode = updateCodeWithVariables(finalCode, variables);
    }

    const isCodeEmpty = !finalCode.trim();
    
    if (isCodeEmpty) {
       setActiveCode('');
       setEditorContent('');
       return;
    }

    // Trigger update (which will fire the R code execution effect)
    if (finalCode !== activeCode) {
      setEditorContent(finalCode);
      setActiveCode(finalCode);
    } else {
      // Force execution even if code hasn't changed
      eventBus.dispatch('run-r-code', { code: activeCode + '\n', source: 'editor' });
    }
  }, [editorContent, activeCode]);

  const currentLabels = useMemo(() => extractLabelsFromCode(editorContent), [editorContent]);
  const currentTheme = useMemo(() => extractThemeFromCode(editorContent), [editorContent]);
  const currentVariables = useMemo(() => extractVariablesFromCode(editorContent), [editorContent]);

  const handleGenerateCode = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    try {
      const generatedCode = await generateRCode(prompt, editorContent, uploadedFiles);
      setEditorContent(generatedCode);
      if (!appSettings.autoSave) {
        setActiveCode(generatedCode);
      }
      setViewMode(CenterViewMode.CODE);
    } catch (error) {
      console.error("Failed to generate code:", error);
      const errorMessage = `// AI Generation Failed: ${(error as Error).message}\n`;
      setEditorContent(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleFileUploads = async (files: FileList) => {
    const newFiles: UploadedFile[] = [];
    for (const file of Array.from(files)) {
        try {
            const buffer = await file.arrayBuffer();
            const contentAsUint8Array = new Uint8Array(buffer);
            const newFile: UploadedFile = {
                id: `${file.name}-${Date.now()}`,
                name: file.name,
                size: file.size,
                type: file.type,
                content: contentAsUint8Array,
                mountPath: null,
            };
            newFiles.push(newFile);
        } catch (error) {
            console.error("Error reading file:", file.name, error);
        }
    }
    if (newFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...newFiles]);
        eventBus.dispatch('mount-files', newFiles);
    }
  };

  const handleDeleteFile = (fileId: string) => {
    const fileToDelete = uploadedFiles.find(f => f.id === fileId);
    if (fileToDelete) {
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
        eventBus.dispatch('unmount-file', fileToDelete);
    }
  };

  const handleViewFile = (file: UploadedFile) => {
    if (file.mountPath) {
        eventBus.dispatch('view-r-file', file);
        setViewMode(CenterViewMode.RESULT_TABLE);
    }
  };

  const convertToCSV = (tableData: TableData): string => {
    if (!tableData || !tableData.data || tableData.data.length === 0) return "";
    const { columns, data } = tableData;
    const formatCell = (cellData: any): string => {
        if (cellData === null || cellData === undefined) return '';
        const str = String(cellData);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            const escapedStr = str.replace(/"/g, '""');
            return `"${escapedStr}"`;
        }
        return str;
    };
    const header = columns.map(formatCell).join(',');
    const rows = data.map(row => columns.map(col => formatCell(row[col])).join(','));
    return [header, ...rows].join('\n');
  };

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const zip = new JSZip();
      if (editorContent.trim()) zip.file("code/script.R", editorContent);
      if (uploadedFiles.length > 0) {
        const dataFolder = zip.folder("data");
        uploadedFiles.forEach(file => dataFolder?.file(file.name, file.content));
      }
      if (rPlots.length > 0) {
        const plotsFolder = zip.folder("plots");
        rPlots.forEach((plot, index) => {
          const base64Data = plot.dataUrl.split(',')[1];
          plotsFolder?.file(`plot_${index + 1}.png`, base64Data, { base64: true });
        });
      }
      if (rTables.length > 0) {
        const tablesFolder = zip.folder("tables");
        rTables.forEach((table, index) => {
          const csvContent = convertToCSV(table);
          const fileName = `table_${index + 1}_${table.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
          tablesFolder?.file(fileName, csvContent);
        });
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      saveAs(zipBlob, `aiplot_export_${timestamp}.zip`);
    } catch (error) {
        console.error("Failed to export project:", error);
    } finally {
        setIsExporting(false);
    }
  };

  const startResizing = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = document.body.clientWidth - e.clientX;
      if (newWidth > 250 && newWidth < document.body.clientWidth * 0.8) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleNewChart = (type: ChartType) => {
    eventBus.dispatch('clear-r-outputs');
    setConfig(getInitialConfig(type));
    setActiveCode(getSampleRCode(type)); 
    setViewMode(CenterViewMode.CODE);
    if (!isRightSidebarOpen && !isMobile) setIsRightSidebarOpen(true);
    setActiveTab(LeftPanelTab.TEXT);
    if (isMobile) setIsMobileSettingsOpen(true);
  };
  
  const toggleLeft = useCallback(() => setIsLeftSidebarOpen(prev => !prev), []);
  const toggleRight = useCallback(() => {
      if (isMobile) setIsMobileSettingsOpen(prev => !prev);
      else setIsRightSidebarOpen(prev => !prev);
  }, [isMobile]);

  const handleTabChange = (tab: LeftPanelTab) => {
    if (isMobile) {
        setActiveTab(tab);
        setIsMobileSettingsOpen(true);
    } else {
        if (!isRightSidebarOpen) {
          setActiveTab(tab);
          setIsRightSidebarOpen(true);
          setSidebarWidth(tab === LeftPanelTab.TERMINAL ? 600 : 320);
        } else {
          if (activeTab === tab) setIsRightSidebarOpen(false);
          else {
            setSidebarWidth(tab === LeftPanelTab.TERMINAL ? 600 : 320);
            setActiveTab(tab);
          }
        }
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInputFocused = /^(INPUT|TEXTAREA)$/.test(target.tagName);
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const isCtrlCmd = isMac ? e.metaKey : e.ctrlKey;
    if (isCtrlCmd && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleManualSave();
      return;
    }
    if (isInputFocused) return;
    if (isCtrlCmd && e.key.toLowerCase() === 'b') { e.preventDefault(); toggleLeft(); }
    if (isCtrlCmd && e.key.toLowerCase() === 'i') { e.preventDefault(); toggleRight(); }
    if (e.altKey) {
        switch(e.key.toLowerCase()) {
            case 'p': e.preventDefault(); setViewMode(CenterViewMode.PLOT); break;
            case 't': e.preventDefault(); setViewMode(CenterViewMode.RESULT_TABLE); break;
            case 'c': e.preventDefault(); setViewMode(CenterViewMode.CODE); break;
        }
    }
  }, [handleManualSave, toggleLeft, toggleRight, setViewMode]);

  useEffect(() => {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const hasUnsavedChanges = !appSettings.autoSave && editorContent !== activeCode;

  const renderRightSidebar = () => (
      <RightSidebar 
        activeTab={activeTab} 
        config={config} 
        setConfig={setConfig}
        appSettings={appSettings}
        setAppSettings={setAppSettings}
        uploadedFiles={uploadedFiles}
        onFileUpload={handleFileUploads}
        onFileDelete={handleDeleteFile}
        onFileView={handleViewFile}
        isOpenMobile={isMobileSettingsOpen}
        onCloseMobile={() => setIsMobileSettingsOpen(false)}
        currentLabels={currentLabels}
        currentTheme={currentTheme}
        currentVariables={currentVariables}
        availableVariables={availableVariables}
        onApplyChanges={handleManualSave}
      />
  );

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans text-gray-900 overflow-hidden">
      <Header 
        isLeftOpen={isLeftSidebarOpen}
        toggleLeft={toggleLeft}
        isRightOpen={isRightSidebarOpen}
        toggleRight={toggleRight}
        prompt={prompt}
        setPrompt={setPrompt}
        onGenerate={handleGenerateCode}
        isGenerating={isGenerating}
        onExport={handleExport}
        isExporting={isExporting}
      />
      <div className="flex flex-1 relative overflow-hidden">
        <div className={`relative z-30 transition-all duration-300 ease-in-out ${!isMobile && isLeftSidebarOpen ? 'w-16 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
           <LeftSidebar activeTab={activeTab} setActiveTab={handleTabChange} onNewChart={handleNewChart} />
        </div>
        <div className={`flex-1 relative overflow-hidden ${isMobile ? 'mb-16' : ''}`}>
          <CenterPanel 
            config={config}
            appSettings={appSettings} 
            viewMode={viewMode}
            setViewMode={setViewMode}
            editorContent={editorContent}
            setEditorContent={setEditorContent}
            onManualSave={handleManualSave}
            hasUnsavedChanges={hasUnsavedChanges}
            rPlots={rPlots}
            rTables={rTables}
            setRPlots={setRPlots}
            setRTables={setRTables}
          />
        </div>
        {!isMobile && isRightSidebarOpen && (
          <div className={`w-1 cursor-col-resize hover:bg-blue-400 z-10 transition-colors flex flex-col justify-center items-center group ${isResizing ? 'bg-blue-500' : 'bg-transparent'}`} onMouseDown={startResizing}>
             <div className="h-8 w-1 bg-gray-300 rounded-full group-hover:bg-blue-300" />
          </div>
        )}
        {!isMobile && (
            <div className={`shrink-0 h-full overflow-hidden bg-white border-l border-gray-200 shadow-xl lg:shadow-none ${isResizing ? '' : 'transition-[width,opacity] duration-300 ease-in-out'}`} style={{ width: isRightSidebarOpen ? sidebarWidth : 0, opacity: isRightSidebarOpen ? 1 : 0 }}>
             {renderRightSidebar()}
            </div>
        )}
        {isMobile && renderRightSidebar()}
      </div>
       {showMobileWarning && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm">
            <div className="bg-white p-6 max-w-sm w-full shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-gray-200 animate-in fade-in zoom-in-95 duration-200 rounded-xl">
               <div className="flex flex-col items-center text-center mb-6">
                   <div className="bg-yellow-100 p-3 rounded-full mb-4">
                      <Smartphone className="w-8 h-8 text-yellow-600" />
                   </div>
                   <h2 className="text-xl font-bold text-gray-900 mb-2">Desktop Recommended</h2>
                   <p className="text-sm text-gray-500 leading-relaxed">This application is optimized for professional data visualization tasks on larger screens. Some features may be limited on mobile devices.</p>
               </div>
               <button onClick={() => setShowMobileWarning(false)} className="w-full py-3 bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-800 transition-colors shadow-lg">I Understand</button>
            </div>
          </div>
       )}
    </div>
  );
};

export default App;
