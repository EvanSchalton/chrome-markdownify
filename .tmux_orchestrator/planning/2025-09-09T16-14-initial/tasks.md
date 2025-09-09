## Relevant Files

- `src/manifest.ts` - Chrome extension manifest configuration using @crxjs/vite-plugin (already exists).
- `src/background/index.ts` - Background service worker handling extension lifecycle, context menus, and message passing.
- `src/content/index.prod.tsx` - Production content script for DOM extraction and conversions.
- `src/content/index.dev.tsx` - Development content script (already exists).
- `src/popup/index.html` - Extension popup UI (already exists).
- `src/popup/Popup.tsx` - Popup React component.
- `src/popup/index.tsx` - Popup entry point (already exists).
- `src/utils/converter.ts` - Core HTML to Markdown conversion logic using Turndown.
- `src/utils/converter.test.ts` - Unit tests for converter module.
- `src/utils/clipboard.ts` - Clipboard operations and file download fallback logic.
- `src/utils/clipboard.test.ts` - Unit tests for clipboard operations.
- `src/utils/notifications.ts` - User feedback and notification management.
- `src/utils/dom-extractor.ts` - DOM content extraction and cleaning utilities.
- `src/utils/dom-extractor.test.ts` - Unit tests for DOM extraction.
- `public/icon*.png` - Extension icons (16x16, 32x32, 48x48, 128x128).
- `package.json` - Dependencies and scripts (already configured with Vite).
- `vite.config.ts` - Vite configuration with CRX plugin (already exists).
- `tailwind.config.js` - Tailwind CSS configuration (already exists).
- `tsconfig.json` - TypeScript configuration (already exists).

### Notes

- Template already uses Manifest V3 with @crxjs/vite-plugin
- Uses pnpm as package manager (not npm)
- Use `pnpm test` to run tests (need to add test script)
- Build with `pnpm build` and dev mode with `pnpm dev`
- Development mode auto-reloads via Vite HMR
- TypeScript and React are already configured
- Tailwind CSS and DaisyUI are available for styling
- Extension loads from `dist/` folder after build

## Tasks

- [x] 1.0 Initialize Chrome Extension Project Structure (COMPLETED - Template already set up)

  - [x] 1.1 Project structure exists with Vite + React + TypeScript
  - [x] 1.2 Package.json configured with build tools
  - [x] 1.3 .gitignore already configured
  - [x] 1.4 Vite config with CRX plugin handles bundling
  - [x] 1.5 README exists (needs Chrome Markdownify specific updates)
  - [x] 1.6 Scripts configured (dev, build, lint)
  - [x] 1.7 Install Turndown.js for HTML to Markdown conversion: `pnpm add turndown @types/turndown`
  - [x] 1.8 Add test runner (Vitest recommended for Vite): `pnpm add -D vitest @vitest/ui happy-dom`
  - [x] 1.9 Update package.json with test script

- [x] 2.0 Update Extension Manifest and Metadata

  - [x] 2.1 Update `src/manifest.ts` to add required permissions (contextMenus, clipboardWrite)
  - [x] 2.2 Update package.json with Chrome Markdownify metadata (name, description)
  - [x] 2.3 Background service worker already configured at `src/background/index.ts`
  - [x] 2.4 Content scripts already configured (update if needed)
  - [x] 2.5 Create/update icon files in `public/` directory (icons already exist)
  - [x] 2.6 **Test:** Run `pnpm dev` and load extension to verify manifest
  - [x] 2.7 **Reminder:** Use Chrome DevTools and Vite HMR for debugging

- [x] 3.0 Implement HTML to Markdown Conversion Library

  - [x] 3.1 Install Turndown.js: `pnpm add turndown @types/turndown`
  - [x] 3.2 Create `src/utils/converter.ts` module with TypeScript types
  - [x] 3.3 Configure Turndown for GitHub Flavored Markdown (GFM)
  - [x] 3.4 Implement source URL and timestamp insertion at top of converted content
  - [x] 3.5 Handle edge cases (nested elements, malformed HTML, special characters)
  - [x] 3.6 Write unit tests in `src/utils/converter.test.ts` using Vitest
  - [x] 3.7 **Test:** Verify conversion quality with sample HTML
  - [x] 3.8 **Consider:** Using Task tool for researching Turndown.js best practices

- [x] 4.0 Implement DOM Content Extraction

  - [x] 4.1 Create `src/utils/dom-extractor.ts` with TypeScript types
  - [x] 4.2 Implement full page content extraction method
  - [x] 4.3 Implement selected text extraction with HTML context
  - [x] 4.4 Add page metadata extraction (title, URL, timestamp)
  - [x] 4.5 Handle JavaScript-rendered content properly
  - [x] 4.6 Write unit tests in `src/utils/dom-extractor.test.ts`
  - [x] 4.7 **Reminder:** Test with React SPAs and dynamic content

- [x] 5.0 Implement Content Script for Page Interaction

  - [x] 5.1 Update `src/content/index.prod.tsx` for production use
  - [x] 5.2 Set up Chrome runtime message listeners
  - [x] 5.3 Implement "get-full-page" command handler
  - [x] 5.4 Implement "get-selection" command handler
  - [x] 5.5 Add TypeScript types for message passing
  - [x] 5.6 Implement content size checking (1MB threshold)
  - [x] 5.7 **Test:** Verify content script with `pnpm dev`
  - [x] 5.8 **Reminder:** Test CORS and CSP handling

- [x] 6.0 Implement Background Service Worker

  - [x] 6.1 Update `src/background/index.ts` with service worker logic
  - [x] 6.2 Set up chrome.runtime.onInstalled listener for context menus
  - [x] 6.3 Implement chrome.action.onClicked handler for toolbar icon
  - [x] 6.4 Create context menu: "Copy as Markdown (selection)"
  - [x] 6.5 Create context menu: "Copy as Markdown (full page)"
  - [x] 6.6 Implement TypeScript message handlers and types
  - [x] 6.7 Add error handling with proper TypeScript types
  - [x] 6.8 **Test:** Verify with Chrome DevTools
  - [x] 6.9 **Reminder:** Handle V3 service worker lifecycle

- [x] 7.0 Implement Clipboard and Download Operations

  - [x] 7.1 Create `src/utils/clipboard.ts` with TypeScript types
  - [x] 7.2 Implement async clipboard write with Chrome APIs
  - [x] 7.3 Implement file download fallback for large content
  - [x] 7.4 Generate filename with sanitized title and timestamp
  - [x] 7.5 Handle permissions with proper error types
  - [x] 7.6 Write unit tests in `src/utils/clipboard.test.ts`
  - [x] 7.7 **Test:** Cross-platform clipboard testing
  - [x] 7.8 **Reminder:** Use Blob API with TypeScript

- [x] 8.0 Implement User Notifications and Feedback

  - [x] 8.1 Create `src/utils/notifications.ts` with TypeScript
  - [x] 8.2 Implement success notification component/function
  - [x] 8.3 Implement error notification handling
  - [x] 8.4 Implement download notification feedback
  - [x] 8.5 Add auto-dismiss with setTimeout (2-3 seconds)
  - [x] 8.6 Style with Tailwind CSS classes
  - [x] 8.7 **Test:** Verify notification behavior
  - [x] 8.8 **Consider:** chrome.notifications API vs React toast

- [x] 9.0 Build and Bundle Extension

  - [x] 9.1 Vite already configured for bundling (via CRX plugin)
  - [x] 9.2 Verify dev/prod build configurations in vite.config.ts
  - [x] 9.3 Ensure Turndown is tree-shaken properly
  - [x] 9.4 Optimize bundle size with Vite build analyzer
  - [x] 9.5 Build scripts already in package.json
  - [x] 9.6 Run `pnpm build` to generate dist/ folder
  - [x] 9.7 **Test:** Load dist/ folder in Chrome
  - [x] 9.8 **Reminder:** Check bundle size and performance

- [x] 10.0 Comprehensive Testing and Quality Assurance

  - [x] 10.1 Test on popular sites (GitHub, Wikipedia, docs sites)
  - [x] 10.2 Test various content types and structures
  - [x] 10.3 Performance testing (< 3 second conversion)
  - [x] 10.4 Memory profiling with Chrome DevTools
  - [x] 10.5 Test large content and download fallback
  - [x] 10.6 Verify context menus functionality
  - [x] 10.7 Test error scenarios and edge cases
  - [x] 10.8 Run `pnpm test` for all unit tests
  - [x] 10.9 **Reminder:** Document known issues
  - [x] 10.10 **Consider:** E2E testing with Playwright

- [x] 11.0 Documentation and Release Preparation
  - [x] 11.1 Update README.md with installation instructions
  - [x] 11.2 Document usage instructions for all three copy methods
  - [x] 11.3 Add troubleshooting section for common issues
  - [x] 11.4 Create CHANGELOG.md for version tracking
  - [x] 11.5 Prepare screenshots for Chrome Web Store listing (if publishing)
  - [x] 11.6 Verify all PRD requirements have been met
  - [x] 11.7 **Final Test:** Install extension as end user would and test primary use case (sharing with LLMs)
  - [x] 11.8 **Reminder:** Tag release in git when ready for distribution

### Implementation Notes

- **Phase Approach:** Tasks 1-3 constitute Phase 1 (MVP), Tasks 4-7 are Phase 2, Tasks 8-11 are Phase 3
- **Use Subagents:** Consider using Task tool for researching library usage patterns and best practices
- **Context Management:** Use /compact or /clear between major task groups to manage context
- **Testing First:** Write tests before or alongside implementation for better coverage
- **Incremental Development:** Test each component individually before integration
- **Chrome APIs:** Refer to Chrome Extension documentation for V3-specific requirements
