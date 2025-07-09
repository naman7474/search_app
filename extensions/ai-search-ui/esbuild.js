const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

// Ensure assets directory exists
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Build configuration
const buildOptions = {
  entryPoints: ['./src/index.jsx'],
  bundle: true,
  outfile: './assets/main.js',
  format: 'iife',
  globalName: 'AISearchApp',
  loader: {
    '.js': 'jsx',
    '.jsx': 'jsx'
  },
  jsx: 'automatic',
  jsxImportSource: 'react',
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  minify: process.env.NODE_ENV === 'production',
  sourcemap: false, // Disabled for Shopify theme extensions
  target: ['es2015'],
  external: [], // Bundle everything including React
  banner: {
    js: `/* AI Search App - Built ${new Date().toISOString()} */`
  }
};

// Watch mode for development
const isWatch = process.argv.includes('--watch');

async function build() {
  try {
    if (isWatch) {
      console.log('Starting build in watch mode...');
      const ctx = await esbuild.context(buildOptions);
      await ctx.watch();
      console.log('Watching for changes...');
    } else {
      console.log('Building AI Search UI...');
      await esbuild.build(buildOptions);
      console.log('Build complete!');
      
      // Verify the output
      const stats = fs.statSync('./assets/main.js');
      console.log(`Output size: ${(stats.size / 1024).toFixed(2)} KB`);
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();