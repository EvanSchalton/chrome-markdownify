# Product Requirements Document: Chrome Markdownify Extension

## Introduction/Overview

Chrome Markdownify is a browser extension that enables users to quickly convert and copy web page content as Markdown format. The primary use case is to facilitate sharing web content with Large Language Models (LLMs) and other Markdown-based tools. Users can convert either entire pages or selected portions with a single click or right-click action.

## Goals

1. Enable one-click conversion of web pages to Markdown format
2. Provide seamless copying of converted content to clipboard
3. Support both full-page and partial content selection
4. Ensure fast, reliable conversion of HTML to Markdown
5. Handle large pages gracefully with fallback to file download

## User Stories

1. **As a developer**, I want to copy documentation pages as Markdown so that I can share them with an LLM for code assistance.

2. **As a researcher**, I want to select specific sections of articles and copy them as Markdown so that I can include formatted references in my notes.

3. **As a content creator**, I want to quickly grab entire web pages in Markdown format so that I can repurpose content for my Markdown-based blog.

4. **As any user**, I want visual confirmation when content is copied so that I know the action completed successfully.

## Functional Requirements

### Core Features

1. **Extension Toolbar Button**

   - The extension must display an icon in the Chrome toolbar
   - Clicking the icon must copy the entire current page as Markdown to clipboard
   - The icon must be visible and accessible on all web pages

2. **Right-Click Context Menu - Selection**

   - When text is selected on a page, right-clicking must show "Copy as Markdown (selection)" option
   - This option must convert only the selected HTML content to Markdown
   - The converted content must be copied to the clipboard

3. **Right-Click Context Menu - Full Page**
   - When right-clicking without text selection, must show "Copy as Markdown (full page)" option
   - This option must convert the entire page content to Markdown
   - The converted content must be copied to the clipboard

### Conversion Requirements

4. **HTML to Markdown Conversion**

   - Must convert standard HTML elements to their Markdown equivalents:
     - H1-H6 → # to ######
     - `<p>` → paragraph with proper spacing
     - `<a>` → [text](url)
     - `<img>` → ![alt](src)
     - `<strong>`/`<b>` → **bold**
     - `<em>`/`<i>` → _italic_
     - `<code>` → `inline code`
     - `<pre>` → code blocks with ```
     - `<ul>`/`<ol>` → proper list formatting
     - `<table>` → Markdown table format

5. **DOM Processing**

   - Must convert the currently rendered DOM (not raw HTML source)
   - Must handle JavaScript-rendered content
   - Must process only publicly visible content

6. **Source URL Inclusion**
   - Must include the source URL at the top of converted content
   - Format: `Source: [Page Title](URL)`
   - Must include timestamp of conversion

### User Feedback

7. **Copy Confirmation**

   - Must show visual feedback when content is successfully copied
   - Notification should auto-dismiss after 2-3 seconds
   - Must show error message if copy operation fails

8. **Large Content Handling**
   - Must detect when content exceeds 1MB
   - For oversized content, must fallback to downloading as .md file
   - Must show appropriate message when switching to download mode
   - Downloaded file should be named: `[page-title]-[timestamp].md`

### Technical Requirements

9. **Performance**

   - Conversion must complete within 3 seconds for average web pages
   - Must not freeze or crash the browser tab
   - Must handle conversion errors gracefully

10. **Markdown Format**
    - Must use GitHub Flavored Markdown (GFM) syntax
    - Must preserve formatting as much as possible
    - Must handle nested elements correctly

## Non-Goals (Out of Scope)

- Complex settings or configuration UI (v1 uses sensible defaults)
- Batch processing of multiple pages
- Cloud synchronization or storage
- Content editing interface before copying
- PDF generation or other export formats
- Browser history of conversions
- Custom markdown flavors or templates
- Integration with specific note-taking apps

## Design Considerations

### Extension Icon

- Simple, recognizable icon that combines Markdown "M↓" symbol with copy/clipboard imagery
- Should have active/inactive states

### Context Menu

- Menu items should be clearly labeled
- Icons next to menu items for better recognition

### Notifications

- Non-intrusive toast notification in corner of screen
- Success: "✓ Copied to clipboard"
- Error: "⚠ Failed to copy. Please try again."
- Download: "📥 Content too large, downloading as file..."

## Technical Considerations

### Required Permissions

- `activeTab` - to access current page content
- `contextMenus` - for right-click functionality
- `clipboardWrite` - to copy to clipboard
- `storage` (optional) - for future settings

### Dependencies

- HTML to Markdown conversion library (e.g., Turndown.js or similar)
- Must be lightweight and included in extension bundle

### Browser Compatibility

- Target Chrome/Chromium browsers v100+
- Manifest V3 compliance required

## Success Metrics

1. **Functional Success**

   - User can successfully copy any standard web page as Markdown
   - Conversion preserves essential content structure and formatting
   - Extension works reliably across different websites

2. **Performance Metrics**

   - Conversion time < 3 seconds for 95% of pages
   - No browser crashes or tab freezes
   - Memory usage remains under 50MB during operation

3. **User Satisfaction**
   - Primary user (you) can effectively use it to share content with LLMs
   - Clean, accurate Markdown output that LLMs can parse
   - Minimal friction in the copy workflow

## Open Questions

1. Should the extension attempt to clean up ads/navigation/footer content automatically, or convert everything visible?
2. How should the extension handle special content like embedded tweets, YouTube videos, or other iframes?
3. Should there be a keyboard shortcut for the copy action?
4. For the file download fallback, what's the exact size threshold that makes sense?
5. Should code blocks attempt to detect and include the programming language for syntax highlighting?

## Implementation Notes

### Phase 1 (MVP)

- Basic toolbar icon with full-page copy
- Simple HTML to Markdown conversion
- Clipboard functionality with basic notification

### Phase 2

- Right-click context menus
- Selection-based copying
- Better error handling and feedback

### Phase 3

- Large content handling with file download
- Improved conversion quality
- Performance optimizations

This PRD provides clear requirements for implementing a Chrome extension that converts web pages to Markdown format, with a focus on simplicity and reliability for sharing content with LLMs.
