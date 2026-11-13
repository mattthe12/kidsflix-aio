#!/usr/bin/env node
/**
 * Post-process the Expo web export for static hosting.
 *
 * Expo writes bundled fonts to `dist/assets/node_modules/...`, which hosting
 * validators reject as a dependency path. Copy them to `assets/fonts/...`,
 * rewrite references in the exported files, and drop Expo's internal metadata.
 */
const fs = require('fs');
const path = require('path');

const dist = path.join(process.cwd(), 'dist');
const nested = path.join(dist, 'assets', 'node_modules');
const flat = path.join(dist, 'assets', 'fonts');

if (!fs.existsSync(dist)) {
  console.error('dist/ does not exist. Run: npx expo export --platform web');
  process.exit(1);
}

if (fs.existsSync(nested)) {
  fs.mkdirSync(flat, { recursive: true });
  fs.cpSync(nested, flat, { recursive: true });
  fs.rmSync(nested, { recursive: true, force: true });
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|html|json)$/.test(entry.name)) rewrite(full);
  }
}

function rewrite(file) {
  const before = fs.readFileSync(file, 'utf8');
  const after = before
    .split('assets/node_modules/').join('assets/fonts/')
    .split('assets\\node_modules\\').join('assets/fonts/');
  if (after !== before) fs.writeFileSync(file, after);
}

walk(dist);
fs.rmSync(path.join(dist, 'metadata.json'), { force: true });

console.log('Prepared dist/ for static hosting.');
