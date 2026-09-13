const fs = require('fs');
const path = require('path');

function fixFile(fullPath) {
  let content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes('"use client";')) {
    const lines = content.split('\n');
    let useClientIndex = lines.findIndex(l => l.trim() === '"use client";');
    if (useClientIndex > 0) {
      lines.splice(useClientIndex, 1);
      lines.unshift('"use client";');
      fs.writeFileSync(fullPath, lines.join('\n'), 'utf8');
      console.log('Fixed', fullPath);
    }
  }
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fixFile(fullPath);
    }
  }
}

processDirectory('C:/Projetos/tcc/NutriOpus/src');
