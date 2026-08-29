
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChartConfig, CenterViewMode, AppSettings, TableData, PlotData } from '../types';
import { 
    Code, Table as TableIcon, LineChart as ChartIcon, Copy, Check, AlertCircle, List, 
    ChevronLeft, ChevronRight, Play, ChevronsUpDown, ArrowUp, ArrowDown, Download, 
    Brush, RefreshCcw, Loader2, Save, ZoomIn, ZoomOut, Maximize, Trash2, Image as ImageIcon
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import eventBus from '../utils/eventBus';

interface CenterPanelProps {
  config: ChartConfig;
  appSettings: AppSettings;
  viewMode: CenterViewMode;
  setViewMode: (mode: CenterViewMode) => void;
  editorContent: string;
  setEditorContent: (code: string) => void;
  onManualSave: () => void;
  hasUnsavedChanges: boolean;
  rPlots: PlotData[];
  rTables: TableData[];
  setRPlots: React.Dispatch<React.SetStateAction<PlotData[]>>;
  setRTables: React.Dispatch<React.SetStateAction<TableData[]>>;
}

const CenterPanel: React.FC<CenterPanelProps> = ({ 
  config, 
  appSettings, 
  viewMode, 
  setViewMode, 
  editorContent,
  setEditorContent,
  onManualSave,
  hasUnsavedChanges,
  rPlots,
  rTables,
  setRPlots,
  setRTables
}) => {
  const [copied, setCopied] = useState(false);
  const [isRCodeRunning, setIsRCodeRunning] = useState(false);
  
  // R Content State
  const [activeRPlotIndex, setActiveRPlotIndex] = useState(0);
  const [activeRTableIndex, setActiveRTableIndex] = useState(0);

  // Zoom/Pan State for R Plots
  const [zoomState, setZoomState] = useState({ scale: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const plotContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Sync active index when new data arrives
  useEffect(() => {
    if (rPlots.length > 0) setActiveRPlotIndex(rPlots.length - 1);
    else setActiveRPlotIndex(0);
  }, [rPlots]);

  useEffect(() => {
    if (rTables.length > 0) setActiveRTableIndex(rTables.length - 1);
    else setActiveRTableIndex(0);
  }, [rTables]);

  // Listen for R execution status
  useEffect(() => {
    const handleStart = () => setIsRCodeRunning(true);
    const handleEnd = () => setIsRCodeRunning(false);
    eventBus.on('r-execution-start', handleStart);
    eventBus.on('r-execution-end', handleEnd);
    return () => {
      eventBus.remove('r-execution-start', handleStart);
      eventBus.remove('r-execution-end', handleEnd);
    };
  }, []);

  // --- Zoom & Pan Logic ---

  const handleResetZoom = () => {
    if (!plotContainerRef.current || !imageRef.current) return;
    const img = imageRef.current;
    const container = plotContainerRef.current;

    // Wait for image to load naturally if dimensions are 0
    if (img.naturalWidth === 0) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;

    const scaleX = (containerWidth - 40) / imgWidth; // -40 for padding
    const scaleY = (containerHeight - 40) / imgHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't upscale by default
    
    // Calculate centered position
    const x = (containerWidth - imgWidth * scale) / 2;
    const y = (containerHeight - imgHeight * scale) / 2;

    setZoomState({ scale, x, y });
  };

  const handleZoomIn = () => {
      setZoomState(prev => ({ ...prev, scale: Math.min(prev.scale * 1.2, 5) }));
  };

  const handleZoomOut = () => {
      setZoomState(prev => ({ ...prev, scale: Math.max(prev.scale / 1.2, 0.1) }));
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!plotContainerRef.current) return;
    // Only zoom if Ctrl is pressed, otherwise standard scroll if needed (though overflow is hidden)
    // Or just always zoom for "Canvas" feel.
    if (!e.ctrlKey && !e.metaKey) return; 
    
    e.preventDefault();
    const zoomFactor = 1.1;
    const newScale = e.deltaY < 0 ? zoomState.scale * zoomFactor : zoomState.scale / zoomFactor;
    const clampedScale = Math.max(0.1, Math.min(newScale, 5));

    // Simple center zoom for now to keep logic robust
    // For mouse-aware zoom, we'd need more complex x/y math based on cursor pos
    setZoomState(prev => ({ ...prev, scale: clampedScale }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    e.preventDefault();
    setIsPanning(true);
    panStartRef.current = {
        x: e.clientX - zoomState.x,
        y: e.clientY - zoomState.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    e.preventDefault();
    const newX = e.clientX - panStartRef.current.x;
    const newY = e.clientY - panStartRef.current.y;
    setZoomState(prev => ({ ...prev, x: newX, y: newY }));
  };

  const handleMouseUpOrLeave = () => {
    setIsPanning(false);
  };

  // --- Navigation & Actions ---

  const handleNext = () => {
    if (viewMode === CenterViewMode.PLOT) {
        setActiveRPlotIndex(prev => {
            const next = Math.min(prev + 1, rPlots.length - 1);
            return next;
        });
    } else if (viewMode === CenterViewMode.RESULT_TABLE) {
        setActiveRTableIndex(prev => Math.min(prev + 1, rTables.length - 1));
    }
  };

  const handlePrev = () => {
    if (viewMode === CenterViewMode.PLOT) {
        setActiveRPlotIndex(prev => Math.max(prev - 1, 0));
    } else if (viewMode === CenterViewMode.RESULT_TABLE) {
        setActiveRTableIndex(prev => Math.max(prev - 1, 0));
    }
  };

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(editorContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyImageToClipboard = async () => {
      const currentPlot = rPlots[activeRPlotIndex];
      if (!currentPlot) return;
      try {
          const response = await fetch(currentPlot.dataUrl);
          const blob = await response.blob();
          await navigator.clipboard.write([
              new ClipboardItem({ [blob.type]: blob })
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      } catch (err) {
          console.error('Failed to copy image', err);
      }
  };
  
  const runInTerminal = () => {
    onManualSave();
  };
  
  const handleExportRPlot = () => {
        const currentPlot = rPlots[activeRPlotIndex];
        if (!currentPlot) return;

        const link = document.createElement('a');
        link.href = currentPlot.dataUrl;
        link.download = `R-plot-${activeRPlotIndex + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
  };
  
  const clearRPlots = () => {
      setRPlots([]);
      setActiveRPlotIndex(0);
  };

  const clearRTables = () => {
      setRTables([]);
      setActiveRTableIndex(0);
  };

  // --- Render Helpers ---

  const renderPlotToolbar = () => {
    const isDark = appSettings.plotViewTheme === 'dark';
    const toolbarBg = isDark ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-600';
    const btnClass = `p-1.5 rounded-md transition-colors flex items-center justify-center ${isDark ? 'hover:bg-gray-700 hover:text-white' : 'hover:bg-gray-100 hover:text-gray-900'} disabled:opacity-30 disabled:cursor-not-allowed`;
    const separatorClass = `h-4 w-px mx-2 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`;

    return (
        <div className={`h-10 flex items-center justify-between px-3 border-b shrink-0 select-none ${toolbarBg}`}>
            {/* Left: Navigation */}
            <div className="flex items-center gap-1">
                <button onClick={handlePrev} disabled={activeRPlotIndex === 0} className={btnClass} title="Previous Plot">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono w-16 text-center">
                   {rPlots.length > 0 ? `${activeRPlotIndex + 1} / ${rPlots.length}` : '0 / 0'}
                </span>
                <button onClick={handleNext} disabled={activeRPlotIndex === rPlots.length - 1} className={btnClass} title="Next Plot">
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Center: Zoom */}
            <div className="flex items-center gap-1">
                 <button onClick={handleZoomOut} className={btnClass} title="Zoom Out">
                    <ZoomOut className="w-4 h-4" />
                 </button>
                 <span className="text-xs font-mono w-12 text-center" title="Current Zoom">
                    {Math.round(zoomState.scale * 100)}%
                 </span>
                 <button onClick={handleZoomIn} className={btnClass} title="Zoom In">
                    <ZoomIn className="w-4 h-4" />
                 </button>
                 <div className={separatorClass} />
                 <button onClick={handleResetZoom} className={btnClass} title="Fit to Screen">
                    <Maximize className="w-4 h-4" />
                 </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1">
                <button onClick={copyImageToClipboard} disabled={rPlots.length === 0} className={btnClass} title="Copy Image to Clipboard">
                   {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <button onClick={handleExportRPlot} disabled={rPlots.length === 0} className={btnClass} title="Download PNG">
                   <Download className="w-4 h-4" />
                </button>
                <div className={separatorClass} />
                <button onClick={clearRPlots} disabled={rPlots.length === 0} className={`${btnClass} hover:bg-red-50 hover:text-red-600`} title="Clear All Plots">
                   <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
  };
  
  const renderChartContent = () => {
    if (rPlots.length > 0) {
        const currentPlot = rPlots[activeRPlotIndex];
        const theme = appSettings.plotViewTheme;

        // Theme Styles
        let containerStyle: React.CSSProperties = {};
        // Removed flex centering to allow absolute positioning math in handleResetZoom to work correctly
        let wrapperClass = "flex-1 overflow-hidden relative w-full h-full ";
        
        if (theme === 'canvas') {
            wrapperClass += "bg-[#F3F4F6]"; // Light gray canvas
            // CSS Dot Grid Pattern
            containerStyle = {
                backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
                backgroundSize: '20px 20px'
            };
        } else if (theme === 'dark') {
            wrapperClass += "bg-gray-900";
        } else {
            wrapperClass += "bg-white";
        }

        return (
            <div className="flex flex-col h-full w-full">
                {renderPlotToolbar()}
                
                <div 
                    ref={plotContainerRef}
                    className={wrapperClass}
                    style={containerStyle}
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUpOrLeave}
                    onMouseLeave={handleMouseUpOrLeave}
                >
                    <img 
                        ref={imageRef}
                        key={currentPlot.id}
                        onLoad={handleResetZoom}
                        src={currentPlot.dataUrl} 
                        alt={`R Plot ${activeRPlotIndex + 1}`} 
                        className={`absolute top-0 left-0 max-w-none transition-transform duration-75 ease-linear will-change-transform ${theme === 'canvas' ? 'shadow-2xl bg-white' : ''}`}
                        style={{
                            transformOrigin: '0 0', 
                            transform: `translate(${zoomState.x}px, ${zoomState.y}px) scale(${zoomState.scale})`,
                            cursor: isPanning ? 'grabbing' : 'grab',
                        }}
                        draggable="false"
                    />
                </div>
            </div>
        );
    } 
    
    // Placeholder View
    return (
        <div className="flex flex-col h-full w-full bg-gray-50">
             <div className="h-10 border-b border-gray-200 bg-white" /> {/* Empty Toolbar Placeholder */}
             <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <div className="bg-white p-4 rounded-full mb-4 shadow-sm">
                    <ImageIcon className="w-12 h-12 text-gray-300" />
                </div>
                <p className="font-semibold text-gray-600">No Plots Generated</p>
                <p className="text-sm mt-2 max-w-xs text-center text-gray-500">
                    Run R code that generates a plot (like <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-700 text-xs">plot()</code> or <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-700 text-xs">ggplot()</code>) to see it here.
                </p>
             </div>
        </div>
    );
  };

  const showNav = viewMode === CenterViewMode.RESULT_TABLE; // Only show table nav in header, plot nav is in toolbar
  const currentNavIndex = activeRTableIndex;
  const currentNavTotal = rTables.length;

  return (
    <main className="w-full h-full bg-gray-100 flex items-center justify-center p-0 md:p-2 overflow-hidden relative transition-all duration-300">
      <div className="bg-white w-full h-full shadow-sm md:shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex flex-col overflow-hidden border-x md:border border-gray-200 md:rounded-lg">
        
        {/* Toggle Header */}
        <div className="h-12 border-b border-gray-200 flex items-center justify-between px-4 bg-gray-50/50 shrink-0">
          <div className="flex bg-gray-200/50 p-1 rounded-lg shrink-0 gap-1">
            <button
              onClick={() => setViewMode(CenterViewMode.PLOT)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === CenterViewMode.PLOT ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
              }`}
            >
              <ChartIcon className="w-3.5 h-3.5" /> Plot
            </button>
            <button
              onClick={() => setViewMode(CenterViewMode.RESULT_TABLE)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === CenterViewMode.RESULT_TABLE ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Table
            </button>
            <button
              onClick={() => setViewMode(CenterViewMode.CODE)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === CenterViewMode.CODE ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
              }`}
            >
              <Code className="w-3.5 h-3.5" /> Code
            </button>
          </div>
          
          {showNav && currentNavTotal > 1 && (
            <div className="flex items-center gap-3 shrink-0">
               <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  Table {currentNavIndex + 1} / {currentNavTotal}
               </span>
               <div className="flex items-center bg-white rounded-md border border-gray-200 shadow-sm">
                    <button 
                      onClick={handlePrev}
                      disabled={currentNavIndex === 0}
                      className="p-1.5 hover:bg-gray-50 disabled:opacity-30 border-r border-gray-200 text-gray-500"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={handleNext}
                      disabled={currentNavIndex === currentNavTotal - 1}
                      className="p-1.5 hover:bg-gray-50 disabled:opacity-30 text-gray-500"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
               </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-0 overflow-hidden relative">
          
          {viewMode === CenterViewMode.PLOT && (
             <div className="w-full h-full">
                  {renderChartContent()}
             </div>
          )}

          {viewMode === CenterViewMode.CODE && (
            <div className="w-full h-full relative group flex flex-col">
               <Editor 
                  height="100%"
                  defaultLanguage="r"
                  value={editorContent}
                  onChange={(value) => setEditorContent(value || '')}
                  options={{
                    minimap: { enabled: appSettings.showMinimap },
                    scrollBeyondLastLine: false,
                    fontSize: appSettings.editorFontSize,
                    wordWrap: appSettings.editorWordWrap,
                    lineNumbers: 'on',
                    renderLineHighlight: 'all',
                    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                    theme: appSettings.theme === 'dark' ? 'vs-dark' : 'vs-light'
                  }}
                  className="border-b border-gray-200"
               />
               <div className="absolute top-4 right-6 flex gap-2 z-10">
                  {hasUnsavedChanges && (
                     <button 
                       onClick={onManualSave}
                       className="bg-blue-600 border border-blue-700 text-white px-3 py-1.5 rounded-md shadow-md hover:bg-blue-700 flex items-center gap-2 text-xs font-semibold transition-all animate-in fade-in slide-in-from-top-2"
                       title="Save Code (Ctrl+S)"
                    >
                       <Save className="w-3.5 h-3.5" />
                       Save
                    </button>
                  )}
                  <div className="flex bg-white/90 backdrop-blur-sm border border-gray-200 rounded-md shadow-sm p-0.5">
                    <button 
                        onClick={runInTerminal}
                        disabled={isRCodeRunning}
                        className="p-1.5 hover:bg-gray-100 text-gray-700 rounded disabled:opacity-50 transition-colors"
                        title="Run Code"
                    >
                        {isRCodeRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                    </button>
                    <div className="w-px bg-gray-200 mx-0.5 my-1"></div>
                    <button 
                        onClick={copyCodeToClipboard}
                        className="p-1.5 hover:bg-gray-100 text-gray-600 rounded transition-colors"
                        title="Copy Code"
                    >
                        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
               </div>
            </div>
          )}

          {/* Result Tables (from R) */}
          {viewMode === CenterViewMode.RESULT_TABLE && (
            <div className="w-full h-full flex flex-col p-0">
               <div className="flex-1 overflow-hidden relative">
                  {rTables.length > 0 ? (
                      <RTableViewer tableData={rTables[activeRTableIndex]} onClear={clearRTables} theme={appSettings.tableViewTheme} />
                  ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <TableIcon className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-sm font-semibold text-gray-500">No Data Tables</p>
                        <p className="text-xs mt-1 text-gray-400">Use <code className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-600">View(df)</code> in R to see data here.</p>
                    </div>
                  )}
               </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
};

// Internal Sub-component for R Table Viewing
const RTableViewer = ({ tableData, onClear, theme }: { tableData: TableData, onClear: () => void, theme: 'standard' | 'minimal' | 'dark' }) => {
    const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'ascending' | 'descending' }>({
        key: null,
        direction: 'ascending',
    });

    const sortedData = useMemo(() => {
        if (!tableData?.data) return [];
        let sortableItems = [...tableData.data];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                const valA = a[sortConfig.key!];
                const valB = b[sortConfig.key!];

                if (valA === null || valA === undefined) return 1;
                if (valB === null || valB === undefined) return -1;

                if (typeof valA === 'number' && typeof valB === 'number') {
                    return sortConfig.direction === 'ascending' ? valA - valB : valB - valA;
                }
                
                const strA = String(valA).toLowerCase();
                const strB = String(valB).toLowerCase();

                if (strA < strB) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (strA > strB) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [tableData?.data, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (columnName: string) => {
        if (sortConfig.key !== columnName) {
            return <ChevronsUpDown className={`h-3 w-3 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />;
        }
        if (sortConfig.direction === 'ascending') {
            return <ArrowUp className={`h-3 w-3 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />;
        }
        return <ArrowDown className={`h-3 w-3 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />;
    };

    const handleExportCSV = () => {
        if (!tableData || !tableData.data || tableData.data.length === 0) return;

        const { columns, data, name } = tableData;

        const formatCell = (cellData: any) => {
            if (cellData === null || cellData === undefined) {
                return '""';
            }
            const str = String(cellData);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                const escapedStr = str.replace(/"/g, '""');
                return `"${escapedStr}"`;
            }
            return `"${str}"`;
        };

        const header = columns.map(formatCell).join(',');
        const rows = data.map(row => 
            columns.map(col => formatCell(row[col])).join(',')
        );

        const csvContent = [header, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        const fileName = `R-table-${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
        link.download = fileName;
        
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Theme definitions
    let bgClass = "bg-white";
    let textClass = "text-gray-700";
    let headerBgClass = "bg-gray-50 border-gray-200 text-gray-500";
    let headerTextClass = "text-gray-700";
    let rowHoverClass = "hover:bg-blue-50/50";
    let cellBorderClass = "border-gray-100";
    let controlBgClass = "bg-white border-gray-200 text-gray-600";

    if (theme === 'dark') {
        bgClass = "bg-gray-900";
        textClass = "text-gray-300";
        headerBgClass = "bg-gray-800 border-gray-700 text-gray-400";
        headerTextClass = "text-gray-200";
        rowHoverClass = "hover:bg-gray-800";
        cellBorderClass = "border-gray-800";
        controlBgClass = "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700";
    } else if (theme === 'minimal') {
        bgClass = "bg-white";
        textClass = "text-gray-800";
        headerBgClass = "bg-white border-gray-200 border-b-2 text-gray-600";
        headerTextClass = "text-gray-900";
        rowHoverClass = "hover:bg-gray-50";
        cellBorderClass = "border-gray-100";
        controlBgClass = "bg-white border-gray-200 text-gray-600 hover:bg-gray-50";
    }

    return (
        <div className={`h-full flex flex-col ${bgClass}`}>
            <div className={`flex justify-between items-center px-4 py-2 border-b shrink-0 ${theme === 'dark' ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                 <div className="flex items-center gap-2">
                    <TableIcon className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                    <h3 className={`font-bold text-xs font-sans truncate max-w-[200px] ${textClass}`}>{tableData.name}</h3>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${theme === 'dark' ? 'bg-gray-800 text-gray-500' : 'bg-gray-200 text-gray-600'}`}>{sortedData.length} rows</span>
                 </div>
                 <div className="flex items-center gap-2">
                     <button onClick={handleExportCSV} className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold border rounded-md transition-all shadow-sm ${controlBgClass}`}>
                        <Download className="w-3 h-3" />
                        <span>CSV</span>
                     </button>
                     <button onClick={onClear} className={`p-1.5 rounded-md hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all border border-transparent ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} title="Clear Table">
                        <Trash2 className="w-3.5 h-3.5" />
                     </button>
                 </div>
            </div>
           
            <div className="overflow-auto flex-grow custom-scrollbar">
                <table className="w-full text-xs border-collapse">
                    <thead className={`sticky top-0 z-10 shadow-sm`}>
                        <tr>
                            <th className={`p-2 font-semibold border-b border-r w-12 text-center ${headerBgClass} ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>#</th>
                            {tableData.columns.map(col => (
                                <th 
                                    key={col} 
                                    className={`p-2 font-semibold border-b border-r text-left cursor-pointer transition-colors select-none min-w-[100px] ${headerBgClass} ${headerTextClass} ${theme === 'dark' ? 'hover:bg-gray-700 border-gray-700' : 'hover:bg-gray-100 border-gray-200'}`}
                                    onClick={() => requestSort(col)}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="truncate">{col}</span>
                                        {getSortIcon(col)}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className={`${bgClass} ${textClass}`}>
                        {sortedData.map((row, i) => (
                            <tr key={i} className={`transition-colors group ${rowHoverClass}`}>
                                <td className={`p-2 border-b border-r text-center font-mono text-[10px] opacity-60 ${cellBorderClass} ${theme === 'dark' ? 'border-gray-800 bg-gray-800/30' : 'border-gray-100 bg-gray-50/30'}`}>{i + 1}</td>
                                {tableData.columns.map(col => (
                                    <td key={col} className={`p-2 border-b border-r whitespace-nowrap font-mono ${cellBorderClass}`}>
                                        {row[col] === null ? <span className="opacity-40 italic">NA</span> : String(row[col])}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CenterPanel;
