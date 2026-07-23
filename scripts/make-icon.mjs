// Renders the MeshView marketplace icon (128x128 PNG) from the SVG source at
// media/icon.svg using headless Chrome/Edge, so it is reproducible.
// Output: media/icon.png.
//
// Usage: node scripts/make-icon.mjs
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, 'media');
const svg = readFileSync(path.join(outDir, 'icon.svg'), 'utf8');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0}svg{display:block}
</style></head><body>${svg}</body></html>`;

const htmlPath = path.join(outDir, '_icon.html');
writeFileSync(htmlPath, html);

const browsers = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];
const browser = browsers.find((b) => existsSync(b));
if (!browser) {
  console.error('No Chrome/Edge found for headless rendering.');
  process.exit(1);
}

const out = path.join(outDir, 'icon.png');
execFileSync(browser, [
  '--headless',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--default-background-color=00000000',
  '--window-size=128,128',
  `--screenshot=${out}`,
  `file:///${htmlPath.replace(/\\/g, '/')}`,
]);

unlinkSync(htmlPath);
console.log('Wrote', path.relative(root, out));
