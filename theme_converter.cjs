const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'features', 'dashboard', 'PatientFlow.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  // Backgrounds
  { pattern: /bg-slate-950/g, replacement: 'bg-surface-container-lowest' },
  { pattern: /bg-slate-900\/50/g, replacement: 'bg-surface-container-low' },
  { pattern: /bg-slate-900\/80/g, replacement: 'bg-surface-container' },
  { pattern: /bg-slate-900/g, replacement: 'bg-surface-container' },
  { pattern: /bg-slate-800/g, replacement: 'bg-surface-container-high' },
  
  // Text Colors
  { pattern: /text-slate-100/g, replacement: 'text-on-surface' },
  { pattern: /text-slate-200/g, replacement: 'text-on-surface' },
  { pattern: /text-slate-300/g, replacement: 'text-on-surface' },
  { pattern: /text-slate-400/g, replacement: 'text-on-surface-variant' },
  { pattern: /text-slate-500/g, replacement: 'text-on-surface-variant' },
  { pattern: /text-slate-600/g, replacement: 'text-on-surface-variant' },
  { pattern: /text-slate-700/g, replacement: 'text-outline' },
  
  // Borders
  { pattern: /border-slate-900/g, replacement: 'border-outline-variant/30' },
  { pattern: /border-slate-850/g, replacement: 'border-outline-variant/50' },
  { pattern: /border-slate-800/g, replacement: 'border-outline-variant' },
  { pattern: /border-slate-700/g, replacement: 'border-outline' },

  // Hover states
  { pattern: /hover:bg-slate-900\/50/g, replacement: 'hover:bg-surface-container-low' },
  { pattern: /hover:bg-slate-900/g, replacement: 'hover:bg-surface-container' },
  { pattern: /hover:border-slate-700/g, replacement: 'hover:border-outline' }
];

replacements.forEach(({ pattern, replacement }) => {
  content = content.replace(pattern, replacement);
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully converted PatientFlow.jsx to light theme!');
