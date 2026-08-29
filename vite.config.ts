
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        /**
         * Strategy to split the application into 5-10 chunks.
         * We isolate heavy dependencies and major application sections.
         */
        manualChunks: (id) => {
          // --- Vendor Chunks (Dependencies) ---
          
          // 1. React Core and Scheduler
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }
          
          // 2. Visualization Engine (Recharts and D3)
          if (id.includes('node_modules/recharts/') || id.includes('node_modules/d3')) {
            return 'vendor-viz';
          }
          
          // 3. Code Editor (Monaco)
          if (id.includes('node_modules/@monaco-editor/') || id.includes('node_modules/monaco-editor/')) {
            return 'vendor-monaco';
          }

          // 4. Icons (Lucide)
          if (id.includes('node_modules/lucide-react/')) {
            return 'vendor-icons';
          }

          // 5. File Utilities (JSZip, FileSaver)
          if (id.includes('node_modules/jszip/') || id.includes('node_modules/file-saver/')) {
            return 'vendor-utils';
          }

          // 6. AI SDK (Google GenAI)
          if (id.includes('node_modules/@google/genai/')) {
            return 'vendor-gemini';
          }

          // --- Application Chunks (Internal Modules) ---

          // 7. R-Terminal and WebR Runtime (Heavy logic)
          if (id.includes('components/RTerminal/')) {
            return 'app-terminal';
          }

          // 8. Main UI Sidebars and Configuration Panels
          if (id.includes('components/RightSidebar.tsx') || id.includes('components/LeftSidebar.tsx')) {
            return 'app-ui-config';
          }

          // 9. Central Viewer and Table Logic
          if (id.includes('components/CenterPanel.tsx')) {
            return 'app-viewer';
          }

          // 10. Core Logic and Manipulation Utilities
          if (id.includes('utils/gemini.ts') || id.includes('utils/codeManipulation.ts') || id.includes('data/defaults.ts')) {
            return 'app-core-logic';
          }
          
          // Entry point (App.tsx / index.tsx) remains in the main bundle chunk
        },
        // Clean and organized file naming for the compiled assets
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // Adjusting limit for split bundles
    chunkSizeWarningLimit: 1000,
  },
});
