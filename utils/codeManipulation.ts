
import { PlotLabels, PlotTheme, PlotVariables } from '../types';

/**
 * Extracts the contents of the labs() function from a ggplot2 code block.
 */
export function extractLabelsFromCode(code: string): PlotLabels {
  const labels: PlotLabels = {};
  
  // Regex to find labs(...) block. 
  const labsRegex = /labs\s*\(([\s\S]*?)\)(?=\s*(\+|$))/;
  const match = code.match(labsRegex);

  if (match && match[1]) {
    const innerContent = match[1];
    
    const extractArg = (key: string) => {
      const argRegex = new RegExp(`${key}\\s*=\\s*(["'])(.*?)\\1`);
      const argMatch = innerContent.match(argRegex);
      return argMatch ? argMatch[2] : undefined;
    };

    labels.title = extractArg('title');
    labels.subtitle = extractArg('subtitle');
    labels.x = extractArg('x');
    labels.y = extractArg('y');
    labels.caption = extractArg('caption');
    labels.color = extractArg('color');
    labels.fill = extractArg('fill');
  }

  return labels;
}

/**
 * Updates the R code by injecting or updating the labs() function.
 */
export function updateCodeWithLabels(code: string, newLabels: PlotLabels): string {
  const args: string[] = [];
  if (newLabels.title) args.push(`title = "${newLabels.title}"`);
  if (newLabels.subtitle) args.push(`subtitle = "${newLabels.subtitle}"`);
  if (newLabels.x) args.push(`x = "${newLabels.x}"`);
  if (newLabels.y) args.push(`y = "${newLabels.y}"`);
  if (newLabels.caption) args.push(`caption = "${newLabels.caption}"`);
  if (newLabels.color) args.push(`color = "${newLabels.color}"`);
  if (newLabels.fill) args.push(`fill = "${newLabels.fill}"`);

  if (args.length === 0) return code;

  const newLabsString = `labs(${args.join(', ')})`;

  const labsRegex = /labs\s*\(([\s\S]*?)\)(?=\s*(\+|$))/;
  if (labsRegex.test(code)) {
    return code.replace(labsRegex, newLabsString);
  }

  const lastPlusIndex = code.lastIndexOf('+');
  if (lastPlusIndex !== -1) {
    return code.trimEnd() + " +\n  " + newLabsString;
  }
  
  if (code.includes('ggplot')) {
      return code.trimEnd() + " +\n  " + newLabsString;
  }

  return code;
}

/**
 * Extracts theme properties from the theme() function in ggplot2 code.
 */
export function extractThemeFromCode(code: string): PlotTheme {
  const theme: PlotTheme = {};
  const themeRegex = /theme\s*\(([\s\S]*?)\)(?=\s*(\+|$))/;
  const match = code.match(themeRegex);

  if (match && match[1]) {
    const args = match[1];

    // Legend Position
    const legPosMatch = args.match(/legend\.position\s*=\s*["']([^"']+)["']/);
    if (legPosMatch) theme.legendPosition = legPosMatch[1];

    // Plot Background Fill
    const plotBgMatch = args.match(/plot\.background\s*=\s*element_rect\s*\([^)]*fill\s*=\s*["']([^"']+)["']/);
    if (plotBgMatch) theme.plotBackgroundFill = plotBgMatch[1];

    // Panel Background Fill
    const panelBgMatch = args.match(/panel\.background\s*=\s*element_rect\s*\([^)]*fill\s*=\s*["']([^"']+)["']/);
    if (panelBgMatch) theme.panelBackgroundFill = panelBgMatch[1];
    
    // Grid Color
    const gridMatch = args.match(/panel\.grid\.major\s*=\s*element_line\s*\([^)]*color\s*=\s*["']([^"']+)["']/);
    if (gridMatch) theme.gridColor = gridMatch[1];
    
    // Axis Text Color
    const axisTextMatch = args.match(/axis\.text\s*=\s*element_text\s*\([^)]*color\s*=\s*["']([^"']+)["']/);
    if (axisTextMatch) theme.axisTextColor = axisTextMatch[1];
  }
  return theme;
}

/**
 * Updates the R code with new theme settings.
 */
export function updateCodeWithTheme(code: string, newTheme: PlotTheme): string {
    const themeRegex = /theme\s*\(([\s\S]*?)\)(?=\s*(\+|$))/;
    const match = code.match(themeRegex);
    
    let themeArgs = match ? match[1] : '';
    let hasTheme = !!match;

    const updateSimpleArg = (key: string, value: string) => {
        const regex = new RegExp(`(${key}\\s*=\\s*)["'][^"']*["']`);
        if (regex.test(themeArgs)) {
            themeArgs = themeArgs.replace(regex, `$1"${value}"`);
        } else {
            themeArgs = themeArgs ? `${themeArgs}, ${key} = "${value}"` : `${key} = "${value}"`;
        }
    };

    const updateElementRectFill = (key: string, fill: string) => {
         const keyRegex = new RegExp(`${key}\\s*=\\s*element_rect\\s*\\(([^)]*)\\)`);
         const keyMatch = themeArgs.match(keyRegex);
         
         if (keyMatch) {
             const inside = keyMatch[1];
             const fillRegex = /fill\s*=\s*["'][^"']*["']/;
             if (fillRegex.test(inside)) {
                 const newInside = inside.replace(fillRegex, `fill = "${fill}"`);
                 themeArgs = themeArgs.replace(keyRegex, `${key} = element_rect(${newInside})`);
             } else {
                 const newInside = inside ? `${inside}, fill = "${fill}"` : `fill = "${fill}"`;
                 themeArgs = themeArgs.replace(keyRegex, `${key} = element_rect(${newInside})`);
             }
         } else {
             const newArg = `${key} = element_rect(fill = "${fill}")`;
             themeArgs = themeArgs ? `${themeArgs}, ${newArg}` : newArg;
         }
    };

    const updateElementLineColor = (key: string, color: string) => {
         const keyRegex = new RegExp(`${key}\\s*=\\s*element_line\\s*\\(([^)]*)\\)`);
         const keyMatch = themeArgs.match(keyRegex);
         if (keyMatch) {
             const inside = keyMatch[1];
             const colorRegex = /color\s*=\s*["'][^"']*["']/;
             if (colorRegex.test(inside)) {
                 const newInside = inside.replace(colorRegex, `color = "${color}"`);
                 themeArgs = themeArgs.replace(keyRegex, `${key} = element_line(${newInside})`);
             } else {
                 const newInside = inside ? `${inside}, color = "${color}"` : `color = "${color}"`;
                 themeArgs = themeArgs.replace(keyRegex, `${key} = element_line(${newInside})`);
             }
         } else {
             const newArg = `${key} = element_line(color = "${color}")`;
             themeArgs = themeArgs ? `${themeArgs}, ${newArg}` : newArg;
         }
    };
    
     const updateElementTextColor = (key: string, color: string) => {
         const keyRegex = new RegExp(`${key}\\s*=\\s*element_text\\s*\\(([^)]*)\\)`);
         const keyMatch = themeArgs.match(keyRegex);
         if (keyMatch) {
             const inside = keyMatch[1];
             const colorRegex = /color\s*=\s*["'][^"']*["']/;
             if (colorRegex.test(inside)) {
                 const newInside = inside.replace(colorRegex, `color = "${color}"`);
                 themeArgs = themeArgs.replace(keyRegex, `${key} = element_text(${newInside})`);
             } else {
                 const newInside = inside ? `${inside}, color = "${color}"` : `color = "${color}"`;
                 themeArgs = themeArgs.replace(keyRegex, `${key} = element_text(${newInside})`);
             }
         } else {
             const newArg = `${key} = element_text(color = "${color}")`;
             themeArgs = themeArgs ? `${themeArgs}, ${newArg}` : newArg;
         }
    };

    if (newTheme.legendPosition) updateSimpleArg('legend.position', newTheme.legendPosition);
    if (newTheme.plotBackgroundFill) updateElementRectFill('plot.background', newTheme.plotBackgroundFill);
    if (newTheme.panelBackgroundFill) updateElementRectFill('panel.background', newTheme.panelBackgroundFill);
    if (newTheme.gridColor) updateElementLineColor('panel.grid.major', newTheme.gridColor);
    if (newTheme.axisTextColor) updateElementTextColor('axis.text', newTheme.axisTextColor);
    
    // Simple cleanup of double commas or leading commas
    themeArgs = themeArgs.replace(/^,\s*/, '').replace(/,\s*$/, '').replace(/,\s*,/g, ',');

    const newThemeBlock = `theme(${themeArgs})`;

    if (hasTheme) {
        return code.replace(themeRegex, newThemeBlock);
    } else {
         const lastPlusIndex = code.lastIndexOf('+');
          if (lastPlusIndex !== -1) {
            return code.trimEnd() + " +\n  " + newThemeBlock;
          }
          if (code.includes('ggplot')) {
              return code.trimEnd() + " +\n  " + newThemeBlock;
          }
          return code;
    }
}

/**
 * Extracts variables from aes() and facet functions.
 */
export function extractVariablesFromCode(code: string): PlotVariables {
  const vars: PlotVariables = {};
  
  // Find aes(...) block
  const aesRegex = /aes\s*\(([\s\S]*?)\)/;
  const aesMatch = code.match(aesRegex);
  
  if (aesMatch && aesMatch[1]) {
    const content = aesMatch[1];
    
    const extractNamedArg = (key: string) => {
      const regex = new RegExp(`${key}\\s*=\\s*([^,\\s)]+)`);
      const match = content.match(regex);
      return match ? match[1].replace(/["']/g, '') : undefined;
    };

    vars.x = extractNamedArg('x');
    vars.y = extractNamedArg('y');
    vars.color = extractNamedArg('color');
    vars.fill = extractNamedArg('fill');

    // Handle positional arguments if named ones missing
    const parts = content.split(',').map(p => p.trim());
    if (!vars.x && parts[0] && !parts[0].includes('=')) vars.x = parts[0].replace(/["']/g, '');
    if (!vars.y && parts[1] && !parts[1].includes('=')) vars.y = parts[1].replace(/["']/g, '');
  }

  // Find facet_wrap or facet_grid
  const facetRegex = /facet_(wrap|grid)\s*\(\s*(~)?\s*([^,)]+)/;
  const facetMatch = code.match(facetRegex);
  if (facetMatch) {
    vars.facet = facetMatch[3].trim().replace(/["']/g, '');
  }

  return vars;
}

/**
 * Updates R code with new aesthetic mappings and facets.
 */
export function updateCodeWithVariables(code: string, newVars: PlotVariables): string {
  let updatedCode = code;

  // 1. Update aes()
  const aesRegex = /aes\s*\(([\s\S]*?)\)/;
  const aesMatch = code.match(aesRegex);

  if (aesMatch) {
    let aesContent = aesMatch[1];
    
    const updateArg = (key: string, val: string | undefined) => {
      if (!val) return;
      const namedRegex = new RegExp(`(${key}\\s*=\\s*)([^,\\s)]+)`);
      if (namedRegex.test(aesContent)) {
        aesContent = aesContent.replace(namedRegex, `$1${val}`);
      } else {
        // If not named, check if it's the first or second positional arg
        const parts = aesContent.split(',').map(p => p.trim());
        if (key === 'x' && parts[0] && !parts[0].includes('=')) {
          parts[0] = val;
          aesContent = parts.join(', ');
        } else if (key === 'y' && parts[1] && !parts[1].includes('=')) {
          parts[1] = val;
          aesContent = parts.join(', ');
        } else {
          // Add as named arg
          aesContent = aesContent ? `${aesContent}, ${key} = ${val}` : `${key} = ${val}`;
        }
      }
    };

    updateArg('x', newVars.x);
    updateArg('y', newVars.y);
    updateArg('color', newVars.color);
    updateArg('fill', newVars.fill);

    updatedCode = updatedCode.replace(aesRegex, `aes(${aesContent})`);
  }

  // 2. Update Facet
  const facetRegex = /facet_(wrap|grid)\s*\(\s*~?\s*([^,)]+)([\s\S]*?)\)/;
  const facetMatch = updatedCode.match(facetRegex);

  if (newVars.facet) {
    const newFacetStr = `facet_wrap(~${newVars.facet})`;
    if (facetMatch) {
      updatedCode = updatedCode.replace(facetRegex, newFacetStr);
    } else {
      updatedCode = updatedCode.trimEnd() + " +\n  " + newFacetStr;
    }
  } else if (facetMatch) {
    // Remove facet if it was there and now is empty
    updatedCode = updatedCode.replace(new RegExp(`\\+\\s*${facetRegex.source}`), '');
    updatedCode = updatedCode.replace(facetRegex, '');
  }

  return updatedCode;
}
