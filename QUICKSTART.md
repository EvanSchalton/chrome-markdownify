# Chrome Markdownify - Quick Start Guide

Chrome Markdownify is a Chrome extension that converts web pages to clean Markdown format with a single click. Perfect for sharing content with LLMs and note-taking apps.

## Loading the Extension in Chrome

### Method 1: Development Mode (Recommended)

1. Build the extension:

   ```bash
   pnpm build
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" (toggle in top-right corner)

4. Click "Load unpacked" button

5. Select the `dist/` folder from this project directory

6. The Chrome Markdownify extension should now appear in your extensions list

### Method 2: Development with Hot Reload

For development with automatic reloading:

```bash
pnpm dev
```

Then follow steps 2-6 above, but select the project root directory instead of `dist/`.

## Testing the Three Main Features

### 1. Toolbar Icon (Full Page Conversion)

- Click the Chrome Markdownify icon in your browser toolbar
- The entire page will be converted to Markdown and copied to your clipboard
- A notification will confirm the successful copy operation

### 2. Context Menu - Full Page

- Right-click anywhere on a web page
- Select "Copy as Markdown (full page)" from the context menu
- The entire page content is converted and copied to clipboard

### 3. Context Menu - Selected Text

- Select/highlight text on any web page
- Right-click on the selected text
- Choose "Copy as Markdown (selection)" from the context menu
- Only the selected content is converted and copied

## Verifying It Works

1. After using any of the three methods, paste (Ctrl+V/Cmd+V) into a text editor
2. You should see clean Markdown with:
   - Source URL and timestamp at the top
   - Properly formatted headers, links, and text
   - Clean structure without ads or navigation elements

## Common Troubleshooting Tips

### Extension Not Appearing

- **Problem**: Extension doesn't show in toolbar or context menus
- **Solution**:
  - Ensure you've completed the build step (`pnpm build`)
  - Check that "Developer mode" is enabled in `chrome://extensions/`
  - Try reloading the extension by clicking the refresh icon

### Permissions Issues

- **Problem**: Context menus don't appear or clipboard operations fail
- **Solution**:
  - Check that the extension has all required permissions
  - Reload the extension in `chrome://extensions/`
  - Try restarting Chrome

### Content Not Converting

- **Problem**: Some pages don't convert properly
- **Solution**:
  - The extension works best on standard HTML content
  - Some heavily JavaScript-based SPAs may need a moment to load
  - Try refreshing the page and waiting for full load before conversion

### Large Content Issues

- **Problem**: Very large pages cause issues
- **Solution**:
  - For pages over 1MB, the extension will automatically download a file instead
  - Check your Downloads folder for "webpage-title-timestamp.md"
  - Consider using the selection method for specific content

### Missing Context Menus

- **Problem**: Right-click menus don't show Markdown options
- **Solution**:
  - Make sure you're right-clicking on page content, not browser UI
  - Some protected pages (chrome://, extensions pages) won't show context menus
  - Try on a regular website like Wikipedia or GitHub

### Clipboard Permissions

- **Problem**: "Could not copy to clipboard" errors
- **Solution**:
  - Ensure the page is focused (click on it first)
  - Some sites may block clipboard access - the extension will try to download a file instead
  - Check browser permissions for the extension

## Testing on Different Sites

Try the extension on various types of content:

- **News articles**: BBC, CNN, New York Times
- **Documentation**: MDN, GitHub READMEs, API docs
- **Wikipedia articles**: Great for testing complex formatting
- **Blog posts**: Medium, Dev.to, personal blogs
- **Code repositories**: GitHub, GitLab file views

## Development and Debugging

- Use Chrome DevTools (F12) to inspect console logs
- Check the extension's background page logs in `chrome://extensions/`
- The popup console can be accessed by right-clicking the extension icon
- For content script debugging, check the main page's console

## Performance Notes

- Conversion typically completes in under 3 seconds
- Very large pages (>1MB) automatically trigger file download
- The extension uses minimal memory and doesn't impact browsing performance
- Content is processed locally - no data is sent to external servers

---

**Need Help?** Check the main README.md or open an issue in the project repository.
