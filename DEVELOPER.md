# Developer Guide

This guide contains instructions for developers who want to contribute to Chrome Markdownify or build it from source.

## Development Setup

### Prerequisites

- Node.js 20.x or higher
- pnpm package manager
- Git

### Installation

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

4. **Load in Chrome for testing**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `dist` folder
   - The extension icon should appear in your toolbar

## Build Commands

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
3. Verify all access methods work:
   - Right-click context menu
   - Extension popup
   - Toolbar icon
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

## Creating a Release

Releases are automatically created when you push a tag to the repository:

```bash
# Create a new version tag
git tag v1.0.0
git push origin v1.0.0
```

This will trigger the GitHub Actions workflow to:

1. Build the extension
2. Run tests
3. Create a ZIP file
4. Create a GitHub release with the ZIP file attached

You can also manually trigger a release from the Actions tab in GitHub.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Run tests: `pnpm test`
5. Run linter: `pnpm lint`
6. Commit changes: `git commit -m "Description of changes"`
7. Push to branch: `git push origin feature-name`
8. Submit a pull request

### Commit Message Guidelines

- Use clear, descriptive commit messages
- Start with a verb in present tense (e.g., "Add", "Fix", "Update")
- Keep the first line under 50 characters
- Add detailed description if needed after a blank line

### Code Style

- Follow the existing code style
- Use TypeScript for all new code
- Ensure all tests pass
- Add tests for new features
- Keep functions small and focused
- Use meaningful variable and function names

## Troubleshooting Development Issues

### Extension Not Loading

- Make sure you've run `pnpm build` first
- Check that Developer mode is enabled in Chrome
- Verify the `dist` folder exists and contains files

### Hot Reload Not Working

- Use `pnpm dev` instead of `pnpm build`
- Some changes (like manifest updates) require manual reload
- Click the reload icon in `chrome://extensions/`

### Build Errors

- Clear the `dist` folder: `rm -rf dist`
- Reinstall dependencies: `rm -rf node_modules && pnpm install`
- Check for TypeScript errors: `pnpm tsc --noEmit`

## License

This project is licensed under the MIT License - see the LICENSE file for details.
