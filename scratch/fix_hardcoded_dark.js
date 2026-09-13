const fs = require('fs');
const path = require('path');

function replacePatterns(content) {
  let modified = content;
  
  // Replace combinations that cause issues in Tailwind 4 with our theme vars
  modified = modified.replace(/bg-white\s+dark:bg-slate-900/g, 'bg-card-bg');
  modified = modified.replace(/bg-white\s+dark:bg-slate-800/g, 'bg-card-bg');
  modified = modified.replace(/bg-slate-50\s+dark:bg-slate-900/g, 'bg-warm-surface');
  modified = modified.replace(/bg-slate-50\s+dark:bg-slate-800/g, 'bg-warm-surface');
  
  modified = modified.replace(/dark:bg-slate-900/g, 'dark:bg-card-bg');
  modified = modified.replace(/dark:bg-slate-800/g, 'dark:bg-card-bg');
  
  modified = modified.replace(/text-slate-900\s+dark:text-white/g, 'text-text-primary');
  modified = modified.replace(/text-slate-900\s+dark:text-slate-100/g, 'text-text-primary');
  modified = modified.replace(/text-slate-700\s+dark:text-slate-300/g, 'text-text-secondary');
  
  modified = modified.replace(/border-slate-200\s+dark:border-slate-700/g, 'border-border-neutral');
  modified = modified.replace(/border-slate-200\s+dark:border-slate-800/g, 'border-border-neutral');
  
  return modified;
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const newContent = replacePatterns(content);
      if (newContent !== content) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log('Fixed hardcoded colors in', fullPath);
      }
    }
  }
}

processDirectory('C:/Projetos/tcc/NutriOpus/src');
