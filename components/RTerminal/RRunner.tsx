import React, { useState, useRef, useEffect } from 'react';
import { FileText, FunctionSquare, Package, Brush, Play, Loader, Plus, HelpCircle } from 'lucide-react';
import type { ConsoleOutput, Environment } from '../../types';

type RunCodeSource = 'editor' | 'console' | 'ai';

interface RRunnerProps {
  consoleOutput: ConsoleOutput[];
  environment: Environment;
  packages: Record<string, string>;
  editorCode: string;
  isLoading: boolean;
  onClearConsole: () => void;
  onViewObject: (name: string) => void;
  runCode: (code: string, source: RunCodeSource) => void;
  onInstallPackage: (name: string) => void;
}

interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    extra?: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, isOpen, onToggle, extra }) => {
  return (
    <div className="flex flex-col h-full bg-white overflow-hidden border-b border-gray-200 last:border-0">
      <button 
        onClick={onToggle} 
        className="w-full text-left p-2 bg-gray-50 hover:bg-gray-100 flex justify-between items-center text-gray-700 flex-shrink-0 border-b border-gray-200 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center space-x-2">
            <h2 className="font-bold text-xs uppercase tracking-wider text-gray-600">{title}</h2>
        </div>
        <div className="flex items-center space-x-2 text-gray-400">
            {extra}
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${isOpen ? '' : '-rotate-90'}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
        </div>
      </button>
      {isOpen && (
        <div className="flex-grow flex flex-col overflow-hidden relative">
          {children}
        </div>
      )}
    </div>
  );
};


export function RRunner({ consoleOutput, environment, packages, editorCode, onClearConsole, onViewObject, runCode, onInstallPackage, isLoading }: RRunnerProps) {
  const [activeTopTab, setActiveTopTab] = useState('Console');
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);

  const handleRunScript = () => {
    runCode(editorCode, 'editor');
  };

  return (
    <div className="h-full flex flex-col text-sm bg-white overflow-hidden">
        <div className="flex flex-col h-full overflow-hidden transition-all duration-300">
          <CollapsibleSection 
              title="R Console & Workspace"
              isOpen={isWorkspaceOpen}
              onToggle={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
          >
              <div className="flex-shrink-0 border-b border-gray-200 bg-white">
                  <nav className="flex">
                      <TabButton isActive={activeTopTab === 'Console'} onClick={() => setActiveTopTab('Console')}>Console</TabButton>
                      <TabButton isActive={activeTopTab === 'Environment'} onClick={() => setActiveTopTab('Environment')}>Environment</TabButton>
                      <TabButton isActive={activeTopTab === 'Package'} onClick={() => setActiveTopTab('Package')}>Packages</TabButton>
                      <TabButton isActive={activeTopTab === 'Help'} onClick={() => setActiveTopTab('Help')}>Help</TabButton>
                  </nav>
              </div>
              <div className="flex-grow overflow-hidden bg-white relative">
                  {activeTopTab === 'Console' && <ConsolePanel output={consoleOutput} onClear={onClearConsole} runCode={runCode} onRunScript={handleRunScript} isLoading={isLoading} />}
                  {activeTopTab === 'Environment' && <EnvironmentPanel environment={environment} onViewObject={onViewObject} runCode={runCode} />}
                  {activeTopTab === 'Package' && <PackagesPanel packages={packages} onInstall={onInstallPackage} isLoading={isLoading} />}
                  {activeTopTab === 'Help' && <HelpPanel />}
              </div>
          </CollapsibleSection>
        </div>
      </div>
  );
}

const TabButton: React.FC<{ isActive: boolean; onClick: () => void; children: React.ReactNode }> = ({ isActive, onClick, children }) => (
    <button onClick={onClick} className={`px-3 py-2 text-xs font-medium border-r border-gray-100 transition-colors relative ${
        isActive 
            ? 'text-blue-600 bg-blue-50/50' 
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
    }`}>
        {children}
        {isActive && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600" />}
    </button>
);

const ConsolePanel = ({ output, onClear, runCode, onRunScript, isLoading }: { output: ConsoleOutput[], onClear: () => void, runCode: (code: string, source: RunCodeSource) => void, onRunScript: () => void, isLoading: boolean }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [inputValue, setInputValue] = useState('');
    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);
    const [tempUserCode, setTempUserCode] = useState('');

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [output]);

    const focusInput = () => inputRef.current?.focus();

    useEffect(() => {
        if (historyIndex > -1 && inputValue !== commandHistory[historyIndex]) {
            setHistoryIndex(-1);
        }
    }, [inputValue, historyIndex, commandHistory]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const trimmedCode = inputValue.trim();
            if (trimmedCode) {
                runCode(trimmedCode, 'console');
                setCommandHistory(prev => [trimmedCode, ...prev.filter(c => c !== trimmedCode)]);
                setHistoryIndex(-1);
                setInputValue('');
                setTempUserCode('');
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (commandHistory.length === 0) return;
            if (historyIndex === -1) {
                setTempUserCode(inputValue);
            }
            const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
            setHistoryIndex(newIndex);
            setInputValue(commandHistory[newIndex]);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex === -1) return;
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            if (newIndex < 0) {
                setInputValue(tempUserCode);
            } else {
                setInputValue(commandHistory[newIndex]);
            }
        }
    };
    
    return (
        <div className="h-full font-mono text-xs whitespace-pre-wrap relative flex flex-col cursor-text bg-white" onClick={focusInput}>
            <div className="absolute top-2 right-2 z-10 flex items-center space-x-1">
                <button
                    onClick={(e) => { e.stopPropagation(); onRunScript(); }}
                    disabled={isLoading}
                    className="p-1.5 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 transition-colors"
                    title="Run Code from Editor"
                >
                    {isLoading ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                </button>
                {output.length > 0 && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClear();
                        }}
                        className="p-1.5 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 border border-gray-200 transition-colors"
                        title="Clear console"
                    >
                        <Brush className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
            <div ref={scrollRef} className="flex-grow overflow-y-auto p-3 custom-scrollbar">
                {output.map((line, index) => {
                    let colorClass = '';
                    let prefix = '';
                    switch (line.type) {
                        case 'input':
                            colorClass = 'text-blue-600 font-bold mt-1';
                            prefix = '> ';
                            break;
                        case 'stdout':
                            colorClass = 'text-gray-800';
                            break;
                        case 'stderr':
                            colorClass = 'text-red-600 bg-red-50/50 w-full inline-block rounded px-1';
                            break;
                        case 'system':
                            colorClass = 'text-purple-600 italic opacity-80';
                            prefix = '# ';
                            break;
                    }
                    return <div key={index} className={`${colorClass} break-words leading-relaxed`}>{prefix}{line.message}</div>;
                })}
            </div>
            <div className="flex-shrink-0 flex items-center px-3 py-2 bg-gray-50 border-t border-gray-100">
                <span className="text-blue-600 font-bold mr-2">&gt;</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-grow bg-transparent border-none focus:ring-0 focus:outline-none p-0 font-mono text-xs text-gray-800 placeholder-gray-400"
                    autoFocus
                    spellCheck="false"
                    aria-label="R console input"
                    placeholder="Enter R code..."
                />
            </div>
        </div>
    );
};

const HelpPanel = () => (
    <div className="h-full overflow-y-auto p-4 text-xs text-gray-700 space-y-4">
        <div>
            <h3 className="font-bold text-sm text-gray-800 mb-2">Keyboard Shortcuts</h3>
            <ul className="list-disc list-inside space-y-1.5 text-gray-600">
                <li><span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">Cmd/Ctrl + S</span> Save & Run Code</li>
                <li><span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">Cmd/Ctrl + B</span> Toggle Left Sidebar</li>
                <li><span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">Cmd/Ctrl + I</span> Toggle Right Sidebar</li>
                <li><span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">Alt + P</span> Switch to Plot View</li>
                <li><span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">Alt + T</span> Switch to Table View</li>
                <li><span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">Alt + C</span> Switch to Code View</li>
                <li className="pt-1"><span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">Up/Down Arrow</span> Navigate console history</li>
            </ul>
        </div>
        <div>
            <h3 className="font-bold text-sm text-gray-800 mb-2 pt-2 border-t border-gray-100">How to Use</h3>
            <dl className="space-y-3">
                <div className="bg-gray-50 p-2 rounded border border-gray-100">
                    <dt className="font-semibold text-gray-900 mb-1">Viewing Data</dt>
                    <dd className="text-gray-600">Use <code className="font-mono text-blue-600">View(df)</code> to display data frames in the "Tables" tab of the Center Panel.</dd>
                </div>
                <div className="bg-gray-50 p-2 rounded border border-gray-100">
                    <dt className="font-semibold text-gray-900 mb-1">Generating Plots</dt>
                    <dd className="text-gray-600">Standard commands like <code className="font-mono text-blue-600">plot()</code> or <code className="font-mono text-blue-600">hist()</code> will automatically appear in the "Plots" tab of the Center Panel.</dd>
                </div>
                <div className="bg-gray-50 p-2 rounded border border-gray-100">
                    <dt className="font-semibold text-gray-900 mb-1">Installing Packages</dt>
                    <dd className="text-gray-600">Enter the package name in the "Packages" tab to install from WebR repo.</dd>
                </div>
            </dl>
        </div>
    </div>
);

const EnvironmentPanel = ({ environment, onViewObject, runCode }: { environment: Environment, onViewObject: (name: string) => void, runCode: (code: string, source: RunCodeSource) => void }) => (
    <div className="h-full overflow-y-auto bg-white">
        {Object.keys(environment).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4 text-center">
                <span className="text-xs">Environment is empty</span>
            </div>
        ) : (
            <table className="w-full text-left text-xs">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="p-2 font-semibold text-gray-600 w-1/3">Name</th>
                        <th className="p-2 font-semibold text-gray-600">Details</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {Object.entries(environment).map(([name, details]) => {
                        const isDataFrame = details.class.includes('data.frame');
                        
                        const handleClick = () => {
                            if (isDataFrame) {
                                onViewObject(name);
                            } else {
                                runCode(name, 'console');
                            }
                        };
                        
                        const title = isDataFrame 
                            ? `Click to view '${name}' in the Tables tab`
                            : `Click to print the value of '${name}' to the console`;

                        return (
                            <tr
                                key={name}
                                className="hover:bg-blue-50 cursor-pointer transition-colors group"
                                onClick={handleClick}
                                title={title}
                            >
                                <td className="p-2 font-mono text-gray-900 flex items-center gap-2">
                                    {details.objectType === 'function'
                                        ? <FunctionSquare className="h-3 w-3 text-purple-500" aria-label="Function"/>
                                        : <FileText className="h-3 w-3 text-blue-500" aria-label="Variable"/>
                                    }
                                    <span className="group-hover:text-blue-700 transition-colors">{name}</span>
                                </td>
                                <td className="p-2 font-mono text-gray-500 truncate max-w-[150px]">{details.str}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        )}
    </div>
);

const PackagesPanel = ({ packages, onInstall, isLoading }: { packages: Record<string, string>, onInstall: (name: string) => void, isLoading: boolean }) => {
    const [pkgName, setPkgName] = useState('');

    const handleInstall = (e: React.FormEvent) => {
        e.preventDefault();
        if (pkgName.trim()) {
            onInstall(pkgName.trim());
            setPkgName('');
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="p-2 border-b border-gray-200 bg-gray-50">
                <form onSubmit={handleInstall} className="flex gap-2">
                    <input 
                        type="text" 
                        value={pkgName}
                        onChange={(e) => setPkgName(e.target.value)}
                        placeholder="Install package..."
                        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                    />
                    <button 
                        type="submit" 
                        disabled={!pkgName.trim() || isLoading}
                        className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Install Package"
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </button>
                </form>
            </div>
            <div className="flex-grow overflow-y-auto p-2">
                {Object.keys(packages).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4 text-center">
                        <span className="text-xs">No user packages loaded</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-1">
                        {Object.entries(packages)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([pkgName, pkgVersion]) => (
                            <div key={pkgName} className="font-mono text-xs text-gray-700 p-2 rounded border border-transparent hover:border-gray-200 hover:bg-gray-50 flex items-center justify-between transition-all">
                                <div className="flex items-center gap-2">
                                    <Package className="h-3 w-3 text-green-600" aria-label="Package"/>
                                    <span className="font-medium">{pkgName}</span>
                                </div>
                                <span className="text-gray-400 text-[10px]">{pkgVersion}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};