// Bundles the browser-side webview code (Three.js + STL viewer) -> media/webview.js
const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
  const ctx = await esbuild.context({
    entryPoints: [{ in: 'src/webview/main.ts', out: 'webview' }],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    outdir: 'media',
  });
  if (watch) {
    await ctx.watch();
    console.log('[esbuild] watching webview bundle...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
