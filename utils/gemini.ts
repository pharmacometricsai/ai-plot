import { GoogleGenAI } from "@google/genai";
import { UploadedFile } from '../types';


/**
 * PROPOSED SECURE RETRIEVAL METHOD
 * This function fetches the API key from a secure backend script.
 * Includes caching and basic error handling.
 */

let __persistentToken: string | null = null;

async function _fetchRemoteHandshake(): Promise<string> {
  if (__persistentToken) return __persistentToken;

  try {

    const response = await fetch('/fetchkey.php', {
      method: 'POST', // or POST if required by your script
      headers: {
        'Content-Type': 'application/json',
        // 'X-Auth-Token': '...' // Add any required app-level authentication
      },
      cache: 'no-store' // Ensure we don't get a stale cached response
    });
    if (!response.ok) {
      throw new Error(`Auth server returned status ${response.status}`);
    }

    const payload = await response.json();
    
    if (!payload || !payload.kok) {
      throw new Error("Handshake payload missing expected 'token' property.");
    }

    __persistentToken = payload.kok;
    return __persistentToken;
  } catch (err) {
    console.error("Critical: Remote service handshake failed.", err);
    throw new Error("Unable to establish secure connection to the reasoning engine.");
  }
}


const MAX_PREVIEW_LINES = 10;
const MAX_PREVIEW_CHARS = 2000;

function createDatasetContext(uploadedFiles: UploadedFile[]): string {
    if (!uploadedFiles || uploadedFiles.length === 0) {
        return '';
    }

    const decoder = new TextDecoder('utf-8');

    const fileContexts = uploadedFiles
        .filter(file => file.mountPath)
        .map(file => {
            try {
                const fullContent = decoder.decode(file.content);
                const lines = fullContent.split('\n');
                const previewLines = lines.slice(0, MAX_PREVIEW_LINES);
                let previewContent = previewLines.join('\n');
                
                if (previewContent.length > MAX_PREVIEW_CHARS) {
                    previewContent = previewContent.substring(0, MAX_PREVIEW_CHARS) + '...';
                }

                return `
Dataset: "${file.name}"
Path in R: "${file.mountPath}"
Content Preview (first few lines):
---
${previewContent}
---
`;
            } catch (error) {
                console.error(`Error processing file ${file.name} for AI context:`, error);
                return '';
            }
        })
        .filter(Boolean)
        .join('');

    if (!fileContexts.trim()) {
        return '';
    }

    return `
You have access to the following datasets uploaded by the user.
Use the file path provided to read the data in your R script (e.g., using read.csv(), read.delim(), etc.).
The content preview will help you understand the column names and data structure.
${fileContexts}
`;
}

/**
 * Generates or edits R code based on a user's natural language prompt and optional existing code.
 */
export async function generateRCode(prompt: string, currentCode: string | undefined, uploadedFiles: UploadedFile[]): Promise<string> {
  const model = "gemini-3-pro-preview"; 

  // --- INITIALIZATION ---
  // Option 1: Use Environment Variable (Default)
  //const serviceKey = _internalServicePointer;
  
  // Option 2: Use Secure Fetch (Uncomment below and the block above to use dynamic fetching)
   const serviceKey = await _fetchRemoteHandshake();

  if (!serviceKey) {
    throw new Error("Missing reasoning service credentials.");
  }

  const ai = new GoogleGenAI({ apiKey: serviceKey });
  // ----------------------

  const datasetContext = createDatasetContext(uploadedFiles);
  let fullPrompt: string;

  if (currentCode && currentCode.trim()) {
    fullPrompt = `
You are an expert R programmer specializing in data visualization with the ggplot2 library.
Your task is to edit the provided R code based on the user's request.
${datasetContext}
IMPORTANT RULES:
1. ONLY provide the full, updated R code.
2. Do NOT include any explanations or markdown formatting like \`\`\`r ... \`\`\`. Your output must be pure, executable R code.
3. Modify the code to incorporate the user's request.
4. If the user refers to an uploaded dataset, ensure the read path is correct (e.g., /home/web_user/filename).
5. Ensure the final script is complete and runnable.

User Request: "${prompt}"

Existing R Code to Edit:
---
${currentCode}
---
`;
  } else {
    fullPrompt = `
You are an expert R programmer specializing in data visualization with the ggplot2 library.
Your task is to generate R code based on a user's request.
${datasetContext}
IMPORTANT RULES:
1. ONLY provide the R code.
2. Do NOT include any explanations, comments, or markdown formatting.
3. Use ggplot2 for all visualizations.
4. If the user's request refers to an uploaded dataset, include code to read the file from its specified path.
5. If no dataset is referred to, create a small sample dataframe within the script.

User Request: "${prompt}"
`;
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: fullPrompt,
    });
    
    const code = response.text?.trim();
    if (!code) throw new Error("Empty response from reasoning engine.");
    
    return code.replace(/^```r\n|```$/g, '').trim();
  } catch (error) {
    console.error("Code generation error:", error);
    throw error;
  }
}
