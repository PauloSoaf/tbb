const fs = require('fs');
const path = require('path');

function replaceHoverPatterns(content) {
  let modified = content;
  
  modified = modified.replace(/hover:bg-slate-50\s+dark:hover:bg-slate-900/g, 'hover:bg-warm-surface');
  modified = modified.replace(/hover:bg-slate-50\s+dark:hover:bg-slate-800/g, 'hover:bg-warm-surface');
  modified = modified.replace(/hover:bg-slate-100\s+dark:hover:bg-slate-800/g, 'hover:bg-warm-beige');
  modified = modified.replace(/hover:bg-slate-100\s+dark:hover:bg-slate-900/g, 'hover:bg-warm-beige');
  modified = modified.replace(/hover:bg-gray-50\s+dark:hover:bg-gray-800/g, 'hover:bg-warm-surface');
  
  modified = modified.replace(/dark:hover:bg-slate-900/g, 'hover:bg-warm-surface');
  modified = modified.replace(/dark:hover:bg-slate-800/g, 'hover:bg-warm-beige');
  
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
      const newContent = replaceHoverPatterns(content);
      if (newContent !== content) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log('Fixed hover hardcoded colors in', fullPath);
      }
    }
  }
}

processDirectory('C:/Projetos/tcc/NutriOpus/src');
