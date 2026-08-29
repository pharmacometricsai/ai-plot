
import React from 'react';
import { Download, PanelLeft, PanelRight, X, Wand2, Loader2 } from 'lucide-react';

interface HeaderProps {
  isLeftOpen: boolean;
  toggleLeft: () => void;
  isRightOpen: boolean;
  toggleRight: () => void;
  prompt: string;
  setPrompt: (prompt: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onExport: () => void;
  isExporting: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  isLeftOpen,
  toggleLeft,
  isRightOpen,
  toggleRight,
  prompt,
  setPrompt,
  onGenerate,
  isGenerating,
  onExport,
  isExporting,
}) => {
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Submit on Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      onGenerate();
    }
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between sticky top-0 z-50 shrink-0 shadow-sm">
      
      {/* Branding Area & Left Toggle */}
      <div className="flex items-center h-full shrink-0">
        <div className="hidden md:flex items-center justify-center px-4 h-full bg-slate-800 text-white">
            <img 
              src="https://aiplot.pharmacometrics.ai/aiplot.webp" 
              alt="AIPlot Logo" 
              className="h-8 w-auto"
            />
        </div>
        {/* Mobile Logo Icon Only */}
        <div className="md:hidden flex items-center justify-center px-3 h-full bg-slate-800 text-white">
             <img 
              src="https://aiplot.pharmacometrics.ai/aiplot.webp" 
              alt="Logo" 
              className="h-6 w-auto"
            />
        </div>

        <button 
            onClick={toggleLeft}
            className={`hidden lg:flex h-full w-12 items-center justify-center transition-colors border-l border-slate-700 ${isLeftOpen ? 'text-slate-900 bg-slate-100' : 'text-gray-500 hover:text-slate-800 hover:bg-slate-50'}`}
            title={isLeftOpen ? "Close Sidebar" : "Open Sidebar"}
        >
            {isLeftOpen ? <X className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
        </button>
      </div>


      {/* AI Generation Input - Central Area */}
      <div className="flex-1 flex justify-center items-center px-4 min-w-0">
        <div className="relative w-full flex items-center">
          <Wand2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Describe the plot you want to create or modify..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
            className="w-full h-9 pl-10 pr-28 text-sm bg-white focus:ring-0 disabled:opacity-60"
          />
          <button 
            onClick={onGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-4 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold transition-all rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : "Generate"}
          </button>
        </div>
      </div>



      {/* Right Actions & Toggle */}
      <div className="flex items-center h-full shrink-0 md:border-l md:border-gray-200 pl-1">
        <button 
          onClick={onExport}
          disabled={isExporting}
          className="h-full w-10 md:w-12 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-wait rounded-l-lg md:rounded-none"
          title="Export Project as ZIP"
        >
           {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
        </button>

        <button 
           onClick={toggleRight}
           className={`h-full w-10 md:w-12 flex items-center justify-center transition-colors md:border-l md:border-gray-200 ${isRightOpen ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`} 
           title={isRightOpen ? "Close Settings" : "Open Settings"}
        >
           <PanelRight className="w-5 h-5" />
        </button>
      </div>

    </header>
  );
};

export default Header;
