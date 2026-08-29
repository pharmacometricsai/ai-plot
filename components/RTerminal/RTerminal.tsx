
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WebR } from 'https://webr.r-wasm.org/latest/webr.mjs';
import { RRunner } from './RRunner';
import eventBus from '../../utils/eventBus';
import type { ConsoleOutput, Environment, UploadedFile } from '../../types';

type RunCodeSource = 'editor' | 'console' | 'ai';

const RTerminal: React.FC = () => {
  // State for RRunner (Console, Env, Packages only)
  const [consoleOutput, setConsoleOutput] = useState<ConsoleOutput[]>([]);
  const [environment, setEnvironment] = useState<Environment>({});
  const [packages, setPackages] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [editorCode, setEditorCode] = useState(''); // Stores code received from CenterPanel

  // Refs for WebR and Canvas
  const webRRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Helper to update Environment Variables - Wrapped in useCallback
  const updateEnvironment = useCallback(async () => {
    if (!webRRef.current) return;
    try {
      // Get objects in global env
      const objs = await webRRef.current.evalR("ls()");
      const objNames = await objs.toArray();
      
      const newEnv: Environment = {};
      
      for (const name of objNames) {
         if (name.startsWith('.')) continue; // Skip hidden objects

         // Get class
         const classRes = await webRRef.current.evalR(`class(${name})`);
         const classArr = await classRes.toArray();
         
         // Get simple string representation
         const strRes = await webRRef.current.evalR(`capture.output(str(${name}, max.level=0, give.attr=FALSE))`);
         const strLines = await strRes.toArray();
         
         let objectType: any = 'variable';
         let columns: string[] | undefined = undefined;

         if (classArr.includes('function')) objectType = 'function';
         if (classArr.includes('data.frame')) {
            objectType = 'data';
            try {
              const colRes = await webRRef.current.evalR(`colnames(${name})`);
              columns = await colRes.toArray();
            } catch (err) {
              console.warn(`Could not get columns for ${name}`, err);
            }
         }
         
         newEnv[name] = {
           class: classArr,
           type: classArr[0],
           str: strLines.join(' ').replace(name, '').trim(),
           objectType,
           columns
         };
      }
      setEnvironment(newEnv);
      eventBus.dispatch('r-environment-updated', newEnv);
      
      // Update loaded packages (simple check of attached packages)
      const pkgRes = await webRRef.current.evalR("(.packages())");
      const pkgs = await pkgRes.toArray();
      const pkgMap: Record<string, string> = {};
      for(const p of pkgs) {
         const ver = await webRRef.current.evalR(`as.character(packageVersion('${p}'))`);
         const verStr = await ver.toArray();
         pkgMap[p] = verStr[0];
      }
      setPackages(pkgMap);

    } catch (e) {
      console.error("Failed to update environment", e);
    }
  }, []);

  const handleViewObject = useCallback(async (name: string) => {
      if (!webRRef.current) return;
      try {
          let result = await webRRef.current.evalR(`is.data.frame(${name})`);
          const isDfVal = await result.toBoolean();
          
          if (!isDfVal) {
              setConsoleOutput(prev => [...prev, { type: 'stderr', message: `Error: View() is only for data frames.`}]);
              return;
          }

          result = await webRRef.current.evalR('requireNamespace("jsonlite", quietly = TRUE)');
          const hasJsonLite = await result.toBoolean();

          if (!hasJsonLite) {
              setConsoleOutput(prev => [...prev, { type: 'system', message: "Installing 'jsonlite' for data viewing..." }]);
              try {
                  await webRRef.current.installPackages(['jsonlite']);
                  setConsoleOutput(prev => [...prev, { type: 'system', message: "'jsonlite' installed." }]);
              } catch (e: any) {
                  throw new Error(`Failed to install 'jsonlite': ${e.message}`);
              }
          }

          const dataRes = await webRRef.current.evalR(`jsonlite::toJSON(head(${name}, 100))`);
          const dataJson = await dataRes.toString();
          
          const parsedData = JSON.parse(dataJson);
          
          if (Array.isArray(parsedData) && parsedData.length > 0) {
              const tableData = {
                  name,
                  columns: Object.keys(parsedData[0]),
                  data: parsedData
              };
              eventBus.dispatch('r-table-created', tableData);
          } else {
             setConsoleOutput(prev => [...prev, { type: 'stdout', message: `(Data frame '${name}' has 0 rows)` }]);
          }

      } catch (e: any) {
          setConsoleOutput(prev => [...prev, { type: 'stderr', message: `Error viewing object: ${e.message}` }]);
      }
  }, []);

  // Run Code - Wrapped in useCallback
  const runCode = useCallback(async (code: string, source: RunCodeSource = 'console') => {
    if (!webRRef.current || !code.trim()) return;

    eventBus.dispatch('r-execution-start');
    setIsLoading(true);
    setConsoleOutput(prev => [...prev, { type: 'input', message: code }]);

    const shelter = await new webRRef.current.Shelter();
    try {
        if (source === 'editor' || source === 'ai') {
            await shelter.evalR('if(dev.cur() != 1) dev.off()');
        }

        const result = await shelter.captureR(code, {
            withAutoprint: true,
            captureStreams: true,
            captureConditions: true,
            captureGraphics: true
        });

        const viewRequests: string[] = [];

        result.output?.forEach(evt => {
            if (evt.type === 'stdout' || evt.type === 'stderr') {
                 evt.data.split('\n').forEach(line => {
                    if (evt.type === 'stdout' && line.startsWith('##WEBR_VIEW_OBJECT##:')) {
                        const varName = line.replace('##WEBR_VIEW_OBJECT##:', '').trim();
                        if (varName) {
                            viewRequests.push(varName);
                        }
                    } else if (line) {
                       setConsoleOutput(prev => [...prev, { type: evt.type as 'stdout' | 'stderr', message: line }]);
                    }
                });
            }
        });
        
        result.conditions?.forEach(cond => {
            if (cond.type === 'error') {
                setConsoleOutput(prev => [...prev, { type: 'stderr', message: cond.message }]);
            } else if (cond.type === 'warning') {
                setConsoleOutput(prev => [...prev, { type: 'system', message: `Warning: ${cond.message}` }]);
            }
        });

        if (result.images && result.images.length > 0) {
            for (const image of result.images) {
                const canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(image, 0, 0);
                    const dataUrl = canvas.toDataURL();
                    eventBus.dispatch('r-plot-created', { 
                        id: Date.now().toString(),
                        timestamp: Date.now(),
                        dataUrl: dataUrl 
                    });
                }
            }
        }
        
        if (viewRequests.length > 0) {
            for (const varName of viewRequests) {
                await handleViewObject(varName);
            }
        }

        await updateEnvironment();

    } catch (err: any) {
        setConsoleOutput(prev => [...prev, { type: 'stderr', message: `System Error: ${err.message}` }]);
    } finally {
        shelter.purge();
        setIsLoading(false);
        eventBus.dispatch('r-execution-end');
    }
  }, [updateEnvironment, handleViewObject]);
  
  // Initialization
  useEffect(() => {
    const initWebR = async () => {
      try {
        setConsoleOutput([{ type: 'system', message: 'Initializing WebR...' }]);
        
        const webR = new WebR();
        webRRef.current = webR;
        
        await webR.init();
        
        setConsoleOutput(prev => [...prev, { type: 'system', message: 'WebR initialized. Preparing environment...' }]);

        try {
          setConsoleOutput(prev => [...prev, { type: 'system', message: 'Installing core packages (ggplot2, dplyr)... This may take a moment.' }]);
          await webR.installPackages(['ggplot2', 'dplyr']);
          setConsoleOutput(prev => [...prev, { type: 'system', message: 'Core packages installed successfully.' }]);
        } catch (error: any) {
          setConsoleOutput(prev => [...prev, { type: 'stderr', message: `Failed to install core packages: ${error.message}` }]);
          setConsoleOutput(prev => [...prev, { type: 'system', message: `You can try installing packages manually via the 'Packages' tab.` }]);
        }

        setConsoleOutput(prev => [...prev, { type: 'system', message: 'Overriding View() for table display...' }]);
        await webR.evalRVoid(`
          View <- function(x) {
            cat(paste0("##WEBR_VIEW_OBJECT##:", deparse(substitute(x)), "\\n"))
          }
        `);
        setConsoleOutput(prev => [...prev, { type: 'system', message: 'Custom View() function is active.' }]);
        
        await webR.evalRVoid('webr::canvas(width=800, height=600)');
        setConsoleOutput(prev => [...prev, { type: 'system', message: 'Plotting device ready.' }]);
        
        await updateEnvironment();
        setIsLoading(false);
        eventBus.dispatch('r-ready');

      } catch (error: any) {
        setConsoleOutput(prev => [...prev, { type: 'stderr', message: `Initialization Error: ${error.message}` }]);
        setIsLoading(false);
      }
    };

    initWebR();

  }, [updateEnvironment]);

  // Event Bus Listener for running code from CenterPanel
  useEffect(() => {
    const handleExternalRun = (data: { code: string; source?: RunCodeSource }) => {
      setEditorCode(data.code);
      runCode(data.code, data.source || 'editor');
    };
    eventBus.on('run-r-code', handleExternalRun);
    return () => eventBus.remove('run-r-code', handleExternalRun);
  }, [runCode]);

  // Event Bus listeners for file mounting and viewing
  useEffect(() => {
    const handleMountFiles = async (files: UploadedFile[]) => {
        if (!webRRef.current) return;

        for (const file of files) {
            const mountPath = `/home/web_user/${file.name}`;
            try {
                await webRRef.current.FS.writeFile(mountPath, file.content);
                eventBus.dispatch('file-mounted', { id: file.id, mountPath });
            } catch (error) {
                console.error(`Failed to mount file ${file.name} to WebR`, error);
            }
        }
    };

    const handleUnmountFile = async (file: UploadedFile) => {
        if (!webRRef.current || !file.mountPath) return;

        try {
            await webRRef.current.FS.unlink(file.mountPath);
        } catch (error) {
            console.error(`Failed to unmount file ${file.name} from WebR`, error);
        }
    };

    const handleViewFile = async (file: UploadedFile) => {
        if (!webRRef.current || !file.mountPath) return;

        const varName = `df_${file.name.replace(/[^a-zA-Z0-9_]/g, '_')}`;
        
        let readCommand = '';
        const lowerFileName = file.name.toLowerCase();

        if (lowerFileName.endsWith('.csv')) {
            readCommand = `read.csv("${file.mountPath}")`;
        } else if (lowerFileName.endsWith('.tsv')) {
            readCommand = `read.delim("${file.mountPath}", sep = "\\t")`;
        } else if (lowerFileName.endsWith('.txt') || lowerFileName.endsWith('.dat')) {
            readCommand = `read.table("${file.mountPath}", header = TRUE)`;
        } else {
            setConsoleOutput(prev => [...prev, { type: 'stderr', message: `Error: Unsupported file type for viewing: ${file.name}` }]);
            return;
        }

        const fullCommand = `${varName} <- ${readCommand}\nView(${varName})`;
        runCode(fullCommand, 'console');
    };
    
    eventBus.on('mount-files', handleMountFiles);
    eventBus.on('unmount-file', handleUnmountFile);
    eventBus.on('view-r-file', handleViewFile);

    return () => {
        eventBus.remove('mount-files', handleMountFiles);
        eventBus.remove('unmount-file', handleUnmountFile);
        eventBus.remove('view-r-file', handleViewFile);
    };
  }, [runCode]);


  const installPackage = async (name: string) => {
    if (!webRRef.current) return;
    setIsLoading(true);
    setConsoleOutput(prev => [...prev, { type: 'system', message: `Installing ${name}...` }]);
    
    try {
      await webRRef.current.installPackages([name]);
      
      setConsoleOutput(prev => [...prev, { type: 'system', message: `Package '${name}' installed successfully.` }]);
      
      await webRRef.current.evalR(`library(${name})`);
      await updateEnvironment();
      
    } catch (e: any) {
      setConsoleOutput(prev => [...prev, { type: 'stderr', message: `Install failed: ${e.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full relative flex flex-col">
        <div style={{ position: 'fixed', left: '-9999px', top: 0, opacity: 0 }}>
            <canvas ref={canvasRef} id="webr-canvas" width={800} height={600} />
        </div>

        <RRunner 
            consoleOutput={consoleOutput}
            environment={environment}
            packages={packages}
            editorCode={editorCode}
            isLoading={isLoading}
            onClearConsole={() => setConsoleOutput([])}
            onViewObject={handleViewObject}
            runCode={runCode}
            onInstallPackage={installPackage}
        />
    </div>
  );
};

export default RTerminal;
