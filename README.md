# Chrome Markdownify

Convert and copy web pages to Markdown format with a single click. Perfect for sharing content with LLMs, note-taking apps, and documentation workflows.

## Features

- **One-click conversion**: Copy entire web pages or selected text as clean Markdown
- **Multiple access methods**: Browser extension popup, context menus, and toolbar icon
- **Smart clipboard handling**: Automatic truncation for large content with file download fallback
- **LLM-friendly output**: Clean, well-formatted Markdown optimized for AI consumption
- **Metadata preservation**: Includes source URL and capture timestamp
- **Error handling**: Graceful handling of restricted pages and network issues

## Installation (Developers)

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd chrome-markdownify
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Build the extension**:

   ```bash
   pnpm build
   ```

4. **Load in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `dist` folder
   - The extension icon should appear in your toolbar

## Usage

### Method 1: Extension Popup

1. Click the Chrome Markdownify icon in your browser toolbar
2. Choose from the available options:
   - **Copy Full Page**: Converts the entire visible webpage to Markdown
   - **Copy Selection**: Converts only selected text (disabled if no selection)
   - **Settings**: Opens the extension options page (currently minimal)

### Method 2: Context Menus

- Right-click anywhere on a webpage and select "Copy page as Markdown"
- Select text, then right-click and choose "Copy selection as Markdown"

### Method 3: Toolbar Icon

- Click the extension icon directly to copy the full page (same as Method 1)

### Supported Content

- Text content and formatting (headings, paragraphs, lists, emphasis)
- Tables (converted to GitHub Flavored Markdown format)
- Code blocks with language detection
- Images with alt text and captions
- Links (both inline and reference style)

### Unsupported Pages

The extension cannot convert:

- Chrome internal pages (`chrome://`)
- Extension pages (`chrome-extension://`)
- Local files (`file://`) without proper permissions

## Build Instructions

### Development Build

```bash
# Start development server with hot reload
pnpm dev
```

This creates a development build in the `dist` folder with hot reloading enabled.

### Production Build

```bash
# Type check and build for production
pnpm build
```

### Other Commands

```bash
# Run tests
pnpm test

# Run tests with UI
pnpm test:ui

# Run linter
pnpm lint

# Preview built extension
pnpm preview
```

## Testing

### Automated Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run tests with coverage
pnpm test --coverage
```

### Manual Testing

1. Load the extension in Chrome (see Installation)
2. Test on various websites:
   - Simple text pages (blogs, articles)
   - Complex layouts (e-commerce, social media)
   - Pages with tables and code blocks
   - Pages with images and media
3. Verify all three access methods work
4. Test error handling on restricted pages
5. Check clipboard output in a text editor or Markdown viewer

## Project Structure

```
src/
├── background/         # Service worker and background scripts
├── content/           # Content scripts injected into web pages
├── popup/             # Extension popup UI
├── options/           # Extension options page
├── utils/             # Shared utilities
│   ├── converter.ts   # HTML to Markdown conversion
│   ├── clipboard.ts   # Clipboard operations
│   ├── dom-extractor.ts # DOM content extraction
│   └── notifications.ts # User notifications
├── manifest.ts        # Extension manifest configuration
└── vite-env.d.ts     # TypeScript environment declarations
```

## Technologies Used

- **TypeScript**: Type-safe development
- **React**: UI components and state management
- **Vite**: Fast development and build tooling
- **Tailwind CSS & DaisyUI**: Styling and UI components
- **Turndown**: HTML to Markdown conversion
- **Vitest**: Testing framework
- **Chrome Extension APIs**: Browser integration

## Troubleshooting

### Extension Not Working

1. **Refresh the page** after installing the extension
2. **Check permissions**: Ensure the extension has access to the current site
3. **Reload extension**: Go to `chrome://extensions/`, find Chrome Markdownify, and click the reload icon
4. **Check console**: Open Developer Tools (F12) and look for error messages

### Large Content Issues

- Content over 50KB is automatically truncated with a warning message
- Very large content (>1MB) may trigger a file download instead of clipboard copy
- If clipboard fails, the extension will attempt to offer a file download

### Formatting Issues

- Some complex layouts may not convert perfectly
- Dynamic content loaded by JavaScript might not be captured
- Try selecting specific content instead of converting the full page

### Browser Compatibility

- Designed for Chrome and Chromium-based browsers
- Requires Chrome Extensions Manifest V3 support
- Modern JavaScript features require recent browser versions

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Run tests: `pnpm test`
5. Run linter: `pnpm lint`
6. Commit changes: `git commit -m "Description of changes"`
7. Push to branch: `git push origin feature-name`
8. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
