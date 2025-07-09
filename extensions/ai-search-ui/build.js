const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

console.log('Building AI Search UI extension...');

async function build() {
  try {
    // Ensure assets directory exists
    const assetsDir = path.join(__dirname, 'assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    // Bundle the React code
    const result = await esbuild.build({
      entryPoints: [path.join(__dirname, 'src', 'index.jsx')],
      bundle: true,
      minify: false, // Keep readable for debugging
      format: 'iife', // Immediately Invoked Function Expression for browser
      globalName: 'AISearchApp',
      outfile: path.join(__dirname, 'assets', 'main.js'),
      jsx: 'automatic',
      jsxImportSource: 'react',
      external: ['react', 'react-dom'], // These should be loaded externally
      define: {
        'process.env.NODE_ENV': '"production"'
      },
      banner: {
        js: `
          // AI Search UI Extension - Auto-generated bundle
          // React and ReactDOM are expected to be loaded externally
          if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
            console.error('AI Search: React and ReactDOM must be loaded before this script');
          }
        `
      }
    });

    if (result.errors.length > 0) {
      console.error('Build errors:', result.errors);
      process.exit(1);
    }

    // Update the main.js to use React and ReactDOM from global scope
    let mainJsContent = fs.readFileSync(path.join(__dirname, 'assets', 'main.js'), 'utf8');
    
    // Replace React imports with global references
    mainJsContent = mainJsContent.replace(
      /import\s+\*\s+as\s+React\s+from\s+"react"/g,
      'const React = window.React'
    );
    mainJsContent = mainJsContent.replace(
      /import\s+.*from\s+"react-dom\/client"/g,
      'const { createRoot } = window.ReactDOM'
    );
    
    // Write the updated content
    fs.writeFileSync(path.join(__dirname, 'assets', 'main.js'), mainJsContent);

    console.log('AI Search UI extension built successfully');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Run the build
build();