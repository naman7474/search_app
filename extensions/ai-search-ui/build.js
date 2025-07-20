const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

console.log('Building AI Search UI extension...');

// Extract CSS from the React component
function extractCSSFromReactComponent() {
  const srcPath = path.join(__dirname, 'src', 'index.jsx');
  const content = fs.readFileSync(srcPath, 'utf8');
  
  // Find the styles constant with CSS content
  const stylesMatch = content.match(/const styles = `([\s\S]*?)`;/);
  
  if (stylesMatch && stylesMatch[1]) {
    return stylesMatch[1].trim();
  }
  
  // Fallback: extract from template literal
  const templateMatch = content.match(/styleSheet\.textContent = `([\s\S]*?)`;/);
  if (templateMatch && templateMatch[1]) {
    return templateMatch[1].trim();
  }
  
  return '';
}

// Remove CSS injection from React component
function removeCSSFromReactComponent() {
  const srcPath = path.join(__dirname, 'src', 'index.jsx');
  let content = fs.readFileSync(srcPath, 'utf8');
  
  // Remove the styles constant and injection code
  content = content.replace(/\/\/ Enhanced CSS with modern design[\s\S]*?const styles = `[\s\S]*?`;/, '');
  content = content.replace(/\/\/ Inject styles[\s\S]*?document\.head\.appendChild\(styleSheet\);/, '');
  
  return content;
}

async function build() {
  try {
    // Ensure assets directory exists
    const assetsDir = path.join(__dirname, 'assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    // Extract CSS and write to main.css
    console.log('Extracting CSS...');
    const cssContent = extractCSSFromReactComponent();
    if (cssContent) {
      fs.writeFileSync(path.join(__dirname, 'assets', 'main.css'), cssContent);
      console.log('CSS extracted to main.css');
    } else {
      console.warn('No CSS found to extract');
    }

    // Create a temporary JS file without embedded CSS
    const tempJsPath = path.join(__dirname, 'src', 'index.temp.jsx');
    const jsContentWithoutCSS = removeCSSFromReactComponent();
    fs.writeFileSync(tempJsPath, jsContentWithoutCSS);

    // Bundle the React code
    console.log('Building JavaScript bundle...');
    const result = await esbuild.build({
      entryPoints: [tempJsPath],
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
            // AI Search UI Extension - Auto-generated bundle v${Date.now()}
            // React and ReactDOM are expected to be loaded externally
            if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
              console.error('AI Search: React and ReactDOM must be loaded before this script');
            }
            
            // Clear old caches on script load
            if (typeof window !== 'undefined' && 'caches' in window) {
              window.caches.keys().then(function(cacheNames) {
                cacheNames.forEach(function(cacheName) {
                  if (cacheName.includes('ai-search-v1')) {
                    console.log('Clearing old AI search cache:', cacheName);
                    window.caches.delete(cacheName);
                  }
                });
              });
            }
          `
        }
    });

    // Clean up temp file
    fs.unlinkSync(tempJsPath);

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

    // Generate missing assets if they don't exist
    const requiredAssets = [
      'progressive-enhancement.js',
      'search-interceptor.js',
      'legacy-loader.js',
      'theme-compatibility.css'
    ];

    for (const asset of requiredAssets) {
      const assetPath = path.join(__dirname, 'assets', asset);
      if (!fs.existsSync(assetPath)) {
        console.log(`Generating missing asset: ${asset}`);
        
        if (asset.endsWith('.js')) {
          // Generate basic JS files
          let jsContent = '';
          if (asset === 'progressive-enhancement.js') {
            jsContent = `
// Progressive Enhancement for AI Search
(function() {
  'use strict';
  
  window.SearchEnhancer = {
    init: function() {
      console.log('Search enhancer initialized');
      // Add progressive enhancement logic here
    }
  };
  
  // Auto-initialize if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.SearchEnhancer.init);
  } else {
    window.SearchEnhancer.init();
  }
})();
            `;
          } else if (asset === 'search-interceptor.js') {
            jsContent = `
// AI Search Interceptor
(function() {
  'use strict';
  
  window.AISearchInterceptor = {
    config: {},
    init: function() {
      console.log('AI Search interceptor initialized');
      // Add search interception logic here
    }
  };
  
  // Auto-initialize if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.AISearchInterceptor.init);
  } else {
    window.AISearchInterceptor.init();
  }
})();
            `;
          } else if (asset === 'legacy-loader.js') {
            jsContent = `
// Legacy Theme Loader for AI Search
(function() {
  'use strict';
  
  // Load React dependencies
  function loadReact() {
    return new Promise((resolve, reject) => {
      if (window.React && window.ReactDOM) {
        resolve();
        return;
      }
      
      const reactScript = document.createElement('script');
      reactScript.src = 'https://unpkg.com/react@18/umd/react.production.min.js';
      reactScript.onload = function() {
        const reactDOMScript = document.createElement('script');
        reactDOMScript.src = 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js';
        reactDOMScript.onload = resolve;
        reactDOMScript.onerror = reject;
        document.head.appendChild(reactDOMScript);
      };
      reactScript.onerror = reject;
      document.head.appendChild(reactScript);
    });
  }
  
  // Initialize the search app
  loadReact().then(() => {
    if (typeof AISearchApp !== 'undefined') {
      console.log('AI Search app loaded successfully');
    }
  }).catch(error => {
    console.error('Failed to load React dependencies:', error);
  });
})();
            `;
          }
          fs.writeFileSync(assetPath, jsContent);
        } else if (asset.endsWith('.css')) {
          // Generate basic CSS files
          let cssContent = '';
          if (asset === 'theme-compatibility.css') {
            cssContent = `
/* Theme Compatibility CSS for AI Search */
.ai-search-widget {
  position: relative;
  width: 100%;
}

.ai-search-widget * {
  box-sizing: border-box;
}

/* Reset any conflicting theme styles */
.ai-search-widget input,
.ai-search-widget button {
  font-family: inherit;
  line-height: normal;
}

/* Ensure proper z-index layering */
.ai-search-modal-overlay {
  z-index: 9999 !important;
}

.ai-search-modal {
  z-index: 10000 !important;
}

/* Responsive compatibility */
@media (max-width: 768px) {
  .ai-search-modal {
    margin: 0;
    border-radius: 0;
    height: 100vh !important;
    max-height: none !important;
  }
}
            `;
          }
          fs.writeFileSync(assetPath, cssContent);
        }
      }
    }

    console.log('AI Search UI extension built successfully');
    console.log('Generated files:');
    const files = fs.readdirSync(assetsDir);
    files.forEach(file => {
      const filePath = path.join(assetsDir, file);
      const stats = fs.statSync(filePath);
      console.log(`  - ${file} (${(stats.size / 1024).toFixed(1)}KB)`);
    });

  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Run the build
build();