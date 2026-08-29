import React, { useState, useRef, useEffect } from 'react';
import { Type, Palette, Database, Settings, Plus, Terminal, SlidersHorizontal } from 'lucide-react';
import { LeftPanelTab, ChartType } from '../types';
import { CHART_TYPES } from '../data/defaults';

interface LeftSidebarProps {
  activeTab: LeftPanelTab;
  setActiveTab: (tab: LeftPanelTab) => void;
  onNewChart: (type: ChartType) => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ activeTab, setActiveTab, onNewChart }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const mainItems = [
    { id: LeftPanelTab.TEXT, icon: Type, label: 'Text' },
    { id: LeftPanelTab.COLOR, icon: Palette, label: 'Color' },
    { id: LeftPanelTab.AXIS, icon: SlidersHorizontal, label: 'Axis' },
    { id: LeftPanelTab.DATA, icon: Database, label: 'Data' },
  ];

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNewChartSelect = (type: ChartType) => {
    onNewChart(type);
    setIsDropdownOpen(false);
  };

  return (
    <nav className="
      flex items-center justify-around z-40 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] lg:shadow-none
      fixed bottom-0 left-0 right-0 h-16 px-2
      lg:relative lg:flex-col lg:justify-start lg:h-full lg:w-full lg:border-t-0 lg:border-r lg:bg-[#fcfcfc] lg:py-6 lg:gap-6 lg:z-0
    ">
      
      {/* "New" Action with Dropdown - Desktop Only */}
      <div ref={dropdownRef} className="hidden lg:flex flex-col items-center justify-center w-full mb-2 relative">
        <button 
          onClick={() => setIsDropdownOpen(prev => !prev)}
          className="flex items-center justify-center w-10 h-10 bg-[#cc5533] text-white rounded-full shadow-[0_2px_8px_rgba(204,85,51,0.25)] hover:bg-[#b04529] hover:shadow-md transition-all duration-200"
          title="New Project"
        >
           <Plus className="w-5 h-5 stroke-[2.5px]" />
        </button>

        {isDropdownOpen && (
          <div className="absolute top-0 left-full ml-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-2 animate-fade-in-fast">
            <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Pre-built charts</p>
            {CHART_TYPES.filter(chart => chart.id !== 'general').map(chart => (
              <button
                key={chart.id}
                onClick={() => handleNewChartSelect(chart.id)}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-3 transition-colors"
              >
                <chart.icon className="w-4 h-4" />
                <span>{chart.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="hidden lg:block w-6 h-px bg-gray-200/60 mb-1" />

      {/* Main Tools */}
      {mainItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`
              flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 group relative
              flex-1 lg:flex-none
              lg:w-10 lg:h-10 lg:p-0
              ${isActive 
                ? 'text-blue-600 lg:text-gray-900 lg:bg-gray-100/80' 
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
              }
            `}
            title={item.label}
          >
            <item.icon className={`w-6 h-6 lg:w-5 lg:h-5 transition-transform duration-200 ${isActive ? 'stroke-[2px] scale-110 lg:scale-100' : 'stroke-[1.5px]'}`} />
            
            {/* Mobile Label */}
            <span className={`text-[10px] font-medium leading-none lg:hidden mt-1 ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>{item.label}</span>
          </button>
        );
      })}

      {/* Spacer to push settings to bottom on desktop */}
      <div className="hidden lg:block flex-1" />

      {/* Terminal Item - Added before Settings */}
      <button
        onClick={() => setActiveTab(LeftPanelTab.TERMINAL)}
        className={`
          flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 group relative
          flex-1 lg:flex-none
          lg:w-10 lg:h-10 lg:p-0 mb-1
          ${activeTab === LeftPanelTab.TERMINAL
            ? 'text-blue-600 lg:text-gray-900 lg:bg-gray-100/80' 
            : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
          }
        `}
        title="R Terminal"
      >
        <Terminal className={`w-6 h-6 lg:w-5 lg:h-5 transition-transform duration-200 ${activeTab === LeftPanelTab.TERMINAL ? 'stroke-[2px] scale-110 lg:scale-100' : 'stroke-[1.5px]'}`} />
        <span className={`text-[10px] font-medium leading-none lg:hidden mt-1 ${activeTab === LeftPanelTab.TERMINAL ? 'text-blue-600' : 'text-gray-500'}`}>Term</span>
      </button>

      {/* Settings Item */}
      <button
        onClick={() => setActiveTab(LeftPanelTab.SETTINGS)}
        className={`
          flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 group relative
          flex-1 lg:flex-none
          lg:w-10 lg:h-10 lg:p-0 mb-2
          ${activeTab === LeftPanelTab.SETTINGS 
            ? 'text-blue-600 lg:text-gray-900 lg:bg-gray-100/80' 
            : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
          }
        `}
        title="Settings"
      >
        <Settings className={`w-6 h-6 lg:w-5 lg:h-5 transition-transform duration-200 ${activeTab === LeftPanelTab.SETTINGS ? 'stroke-[2px] scale-110 lg:scale-100' : 'stroke-[1.5px]'}`} />
        <span className={`text-[10px] font-medium leading-none lg:hidden mt-1 ${activeTab === LeftPanelTab.SETTINGS ? 'text-blue-600' : 'text-gray-500'}`}>Settings</span>
      </button>

    </nav>
  );
};

export default LeftSidebar;