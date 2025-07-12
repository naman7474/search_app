# AI Search Component Usage Guide

## Overview
The AI Search component can be used in two ways:

1. **As a Theme Block** (limited to sections only)
2. **As a Snippet** (can be placed anywhere in your theme)

## Display Modes
The search widget supports three display modes:

1. **Search Button** - A standard button with text and icon
2. **Small Square Icon** - A compact square button with just the search icon (perfect for headers)
3. **Search Input** - A text input field that opens the search modal when clicked

## Method 1: Theme Block (Section Only)
This is the standard way to add the search component to your theme sections.

1. In the Shopify theme editor, go to any section
2. Click "Add block" 
3. Select "AI Search"
4. Configure the settings (display mode, results limit, etc.)

**Limitation**: This method only works in theme sections, not in other template files.

## Method 2: Snippet (Anywhere)
Use this method to place the search component anywhere in your theme.

### Basic Usage
```liquid
{% render 'ai-search-anywhere' %}
```

### With Custom Parameters
```liquid
{% render 'ai-search-anywhere', 
  display_mode: 'button', 
  max_results: 15,
  placeholder_text: 'Find your perfect product...',
  class: 'my-custom-class'
%}
```

### Parameters
- `display_mode`: 'bar' (default) or 'button'
- `max_results`: Number of results to show (default: 10)
- `placeholder_text`: Custom placeholder text
- `show_suggestions`: true (default) or false
- `class`: Additional CSS classes

### Example Placements

#### In Header
```liquid
<!-- In sections/header.liquid -->
<div class="header-search">
  {% render 'ai-search-anywhere', display_mode: 'button' %}
</div>
```

#### In Navigation
```liquid
<!-- In snippets/header-nav.liquid -->
<nav class="main-nav">
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/collections">Shop</a></li>
    <li>
      {% render 'ai-search-anywhere', display_mode: 'button', class: 'nav-search' %}
    </li>
  </ul>
</nav>
```

#### In Collection Pages
```liquid
<!-- In templates/collection.liquid -->
<div class="collection-header">
  <h1>{{ collection.title }}</h1>
  {% render 'ai-search-anywhere', placeholder_text: 'Search in {{ collection.title }}...' %}
</div>
```

#### In Product Pages
```liquid
<!-- In templates/product.liquid -->
<div class="product-recommendations">
  <h3>Looking for something else?</h3>
  {% render 'ai-search-anywhere', display_mode: 'bar', max_results: 8 %}
</div>
```

#### In Footer
```liquid
<!-- In sections/footer.liquid -->
<div class="footer-search">
  <h4>Quick Search</h4>
  {% render 'ai-search-anywhere', display_mode: 'bar' %}
</div>
```

## Styling
The component automatically inherits your theme's styling. For custom styling, target these classes:

```css
/* Main container */
.ai-search-widget {
  /* Your styles */
}

/* Search input */
.ai-search-input {
  /* Your styles */
}

/* Search button */
.ai-search-button {
  /* Your styles */
}

/* Modal overlay */
.ai-search-modal-overlay {
  /* Your styles */
}

/* Modal content */
.ai-search-modal {
  /* Your styles */
}
```

## Troubleshooting

### Component Not Loading
1. Make sure the snippet file `ai-search-anywhere.liquid` exists in your `snippets/` folder
2. Check browser console for JavaScript errors
3. Verify the AI Search app is installed and active

### Modal Appears Transparent
This has been fixed with improved CSS fallbacks. If you still see transparency:
1. Clear your browser cache
2. Check if your theme has conflicting CSS
3. The modal should now have solid backgrounds with `!important` declarations

### Multiple Instances
The snippet supports multiple instances on the same page. Each gets a unique ID automatically.

## Support
If you encounter issues, check the browser console for error messages and ensure all files are properly uploaded to your theme. 