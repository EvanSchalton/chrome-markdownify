// Background service worker for Chrome Markdownify extension

// Message types for communication between background script and content scripts
interface MessageRequest {
  action: 'get-full-page' | 'get-selection';
  tabId?: number;
}

interface ContentResponse {
  success: boolean;
  markdown?: string;
  error?: string;
  metadata?: {
    title: string;
    url: string;
    timestamp: string;
  };
  contentSize?: number;
}

// Context menu IDs
const CONTEXT_MENU_IDS = {
  COPY_PAGE: 'copy-full-page',
  COPY_SELECTION: 'copy-selection',
  DOWNLOAD_PAGE: 'download-full-page',
  DOWNLOAD_SELECTION: 'download-selection',
} as const;

/**
 * Set up context menu items when extension is installed
 */
/**
 * Create or update context menus based on current state
 */
async function updateContextMenus(
  hasSelection: boolean = false
): Promise<void> {
  try {
    // Remove any existing context menu items
    await chrome.contextMenus.removeAll();

    // Always show page-level context menus in both page and selection contexts
    chrome.contextMenus.create({
      id: CONTEXT_MENU_IDS.COPY_PAGE,
      title: '[Page] Copy Markdown',
      contexts: ['page', 'selection'], // Show in both contexts
      documentUrlPatterns: ['http://*/*', 'https://*/*'],
    });

    chrome.contextMenus.create({
      id: CONTEXT_MENU_IDS.DOWNLOAD_PAGE,
      title: '[Page] Download Markdown',
      contexts: ['page', 'selection'], // Show in both contexts
      documentUrlPatterns: ['http://*/*', 'https://*/*'],
    });

    // Only show selection context menus when text is selected
    if (hasSelection) {
      chrome.contextMenus.create({
        id: CONTEXT_MENU_IDS.COPY_SELECTION,
        title: '[Selection] Copy Markdown',
        contexts: ['selection'],
        documentUrlPatterns: ['http://*/*', 'https://*/*'],
      });

      chrome.contextMenus.create({
        id: CONTEXT_MENU_IDS.DOWNLOAD_SELECTION,
        title: '[Selection] Download Markdown',
        contexts: ['selection'],
        documentUrlPatterns: ['http://*/*', 'https://*/*'],
      });
    }
  } catch (error) {
    console.error('Chrome Markdownify: Error updating context menus:', error);
  }
}

// Initialize context menus on install/update
chrome.runtime.onInstalled.addListener(async (): Promise<void> => {
  await updateContextMenus(false);
  console.log('Chrome Markdownify: Context menus initialized');
});

/**
 * Handle toolbar icon clicks for full page copy
 */
chrome.action.onClicked.addListener(
  async (tab: chrome.tabs.Tab): Promise<void> => {
    if (!tab.id || !tab.url) {
      console.error('Chrome Markdownify: Invalid tab information');
      return;
    }

    // Skip chrome:// and other restricted pages
    if (
      tab.url.startsWith('chrome://') ||
      tab.url.startsWith('chrome-extension://')
    ) {
      try {
        await chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon48.png',
          title: 'Chrome Markdownify',
          message: 'Cannot convert this page - restricted URL',
        });
      } catch (error) {
        console.error('Chrome Markdownify: Error showing notification:', error);
      }
      return;
    }

    await handleCopyAction('get-full-page', tab.id);
  }
);

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener(
  async (
    info: chrome.contextMenus.OnClickData,
    tab?: chrome.tabs.Tab
  ): Promise<void> => {
    if (!tab?.id) {
      console.error('Chrome Markdownify: No active tab found');
      return;
    }

    switch (info.menuItemId) {
      case CONTEXT_MENU_IDS.COPY_PAGE:
        await handleCopyAction('get-full-page', tab.id);
        break;
      case CONTEXT_MENU_IDS.COPY_SELECTION:
        await handleCopyAction('get-selection', tab.id);
        break;
      case CONTEXT_MENU_IDS.DOWNLOAD_PAGE:
        await handleDownloadAction('get-full-page', tab.id);
        break;
      case CONTEXT_MENU_IDS.DOWNLOAD_SELECTION:
        await handleDownloadAction('get-selection', tab.id);
        break;
      default:
        console.warn(
          'Chrome Markdownify: Unknown context menu item:',
          info.menuItemId
        );
    }
  }
);

/**
 * Handle copy actions by communicating with content script
 */
async function handleCopyAction(
  action: 'get-full-page' | 'get-selection',
  tabId: number
): Promise<void> {
  try {
    // Send message to content script
    const response = (await chrome.tabs.sendMessage(tabId, {
      action,
    } as MessageRequest)) as ContentResponse;

    if (response.success && response.markdown) {
      // Copy to clipboard
      await copyToClipboard(response.markdown, tabId, response.metadata);

      // Show success notification
      await showNotification(
        'Success!',
        `Content copied as Markdown (${formatSize(response.contentSize || 0)})`
      );
    } else {
      // Show error notification
      await showNotification(
        'Error',
        response.error || 'Failed to convert content'
      );
    }
  } catch (error) {
    console.error('Chrome Markdownify: Error handling copy action:', error);

    // Show error notification
    await showNotification(
      'Error',
      'Failed to communicate with page. Please refresh and try again.'
    );
  }
}

/**
 * Copy markdown content to clipboard using script injection
 */
async function copyToClipboard(
  markdown: string,
  tabId: number,
  metadata?: { title: string; url: string; timestamp: string }
): Promise<void> {
  try {
    // For very large content (>50KB), we might want to truncate or warn
    const contentSize = new Blob([markdown]).size;
    let contentToCopy = markdown;

    if (contentSize > 50000) {
      // 50KB threshold
      // Truncate very large content
      contentToCopy = `${markdown.substring(0, 50000)}\n\n... (content truncated due to size)`;
      console.warn(
        `Chrome Markdownify: Content truncated from ${formatSize(contentSize)} to 50KB`
      );
    }

    // Inject script into the active tab to perform clipboard write
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: async (text: string) => {
        // Try modern clipboard API first
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return { success: true, method: 'clipboard' };
          }
        } catch (e) {
          // Expected when popup is open - document not focused. Fallback will work.
          // Don't log this error as it's expected behavior and the fallback handles it.
        }

        // Fallback to document.execCommand
        try {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          textarea.style.pointerEvents = 'none';
          document.body.appendChild(textarea);
          textarea.select();
          const success = document.execCommand('copy');
          document.body.removeChild(textarea);

          if (success) {
            return { success: true, method: 'execCommand' };
          }
        } catch (error) {
          // Only log if we're in a context where neither method works
          // This is very rare and would indicate a real problem
        }

        return { success: false, method: 'none' };
      },
      args: [contentToCopy],
    });

    // Check if clipboard write was successful
    const result = results[0]?.result;
    if (!result?.success) {
      throw new Error('Failed to write to clipboard');
    }

    console.log(
      `Chrome Markdownify: Successfully copied to clipboard using ${result.method}`
    );
  } catch (error) {
    console.error('Chrome Markdownify: Error copying to clipboard:', error);

    // Fallback: try to offer file download
    if (metadata) {
      const filename = generateFilename(metadata.title);
      await offerFileDownload(markdown, filename);
    } else {
      throw new Error(
        'Failed to copy to clipboard and no metadata available for download'
      );
    }
  }
}

/**
 * Handle download actions by communicating with content script
 */
async function handleDownloadAction(
  action: 'get-full-page' | 'get-selection',
  tabId: number
): Promise<void> {
  try {
    // Send message to content script
    const response = (await chrome.tabs.sendMessage(tabId, {
      action,
    } as MessageRequest)) as ContentResponse;

    if (response.success && response.markdown && response.metadata) {
      // Download the file
      const filename = generateFilename(response.metadata.title);
      await offerFileDownload(response.markdown, filename);

      // Show success notification
      await showNotification(
        'Success!',
        `Content downloaded as Markdown (${formatSize(response.contentSize || 0)})`
      );
    } else {
      // Show error notification
      await showNotification(
        'Error',
        response.error || 'Failed to convert content'
      );
    }
  } catch (error) {
    console.error('Chrome Markdownify: Error handling download action:', error);

    // Show error notification
    await showNotification(
      'Error',
      'Failed to communicate with page. Please refresh and try again.'
    );
  }
}

/**
 * Offer file download as fallback when clipboard fails
 */
async function offerFileDownload(
  content: string,
  filename: string
): Promise<void> {
  try {
    // Create a data URL instead of blob URL for better compatibility
    const base64 = btoa(unescape(encodeURIComponent(content)));
    const dataUrl = `data:text/markdown;base64,${base64}`;

    console.log(
      'Chrome Markdownify: Starting download with filename:',
      filename
    );

    const downloadId = await chrome.downloads.download({
      url: dataUrl,
      filename,
      saveAs: false, // Automatically save without prompting
    });

    console.log('Chrome Markdownify: Download started with ID:', downloadId);
  } catch (error) {
    console.error('Chrome Markdownify: Error downloading file:', error);
    // Try alternative method with blob URL
    try {
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const downloadId = await chrome.downloads.download({
        url,
        filename,
        saveAs: false,
      });

      // Clean up after a delay
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      console.log(
        'Chrome Markdownify: Download started with blob URL, ID:',
        downloadId
      );
    } catch (fallbackError) {
      console.error(
        'Chrome Markdownify: Fallback download also failed:',
        fallbackError
      );
      throw new Error('Failed to download file');
    }
  }
}

/**
 * Generate filename from page title
 */
function generateFilename(title: string): string {
  // Sanitize title for filename
  const sanitized = title
    .replace(/[<>:"/\\|?*]/g, '-') // Replace invalid filename characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .substring(0, 100); // Limit length

  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  return `${sanitized}_${timestamp}.md`;
}

/**
 * Show notification to user
 */
async function showNotification(title: string, message: string): Promise<void> {
  try {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon48.png',
      title: `Chrome Markdownify - ${title}`,
      message,
    });
  } catch (error) {
    console.error('Chrome Markdownify: Error showing notification:', error);
  }
}

/**
 * Format file size for display
 */
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

/**
 * Handle messages from popup and content scripts
 */
chrome.runtime.onMessage.addListener(
  (
    request: any,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): boolean => {
    console.log('Chrome Markdownify: Received message:', request);

    // Handle selection status updates from content scripts
    if (request.action === 'selection-changed') {
      updateContextMenus(request.hasSelection);
      sendResponse({ success: true });
      return false;
    }

    // Handle download-full-page message from popup
    if (
      request.action === 'download-full-page' &&
      request.markdown &&
      request.metadata
    ) {
      const filename = generateFilename(request.metadata.title || 'page');
      offerFileDownload(request.markdown, filename)
        .then(() => {
          showNotification('Success!', 'Download started');
          sendResponse({ success: true });
        })
        .catch((error) => {
          console.error('Chrome Markdownify: Download full page error:', error);
          sendResponse({
            success: false,
            error: error.message || 'Failed to download page',
          });
        });

      // Return true to indicate we'll send response asynchronously
      return true;
    }

    // Handle download-selection message from popup
    if (
      request.action === 'download-selection' &&
      request.markdown &&
      request.metadata
    ) {
      const filename = generateFilename(request.metadata.title || 'selection');
      offerFileDownload(request.markdown, filename)
        .then(() => {
          showNotification('Success!', 'Download started');
          sendResponse({ success: true });
        })
        .catch((error) => {
          console.error('Chrome Markdownify: Download selection error:', error);
          sendResponse({
            success: false,
            error: error.message || 'Failed to download selection',
          });
        });

      // Return true to indicate we'll send response asynchronously
      return true;
    }

    // Handle copy-full-page message from popup
    if (
      request.action === 'copy-full-page' &&
      request.tabId &&
      request.markdown
    ) {
      copyToClipboard(request.markdown, request.tabId, request.metadata)
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          console.error('Chrome Markdownify: Copy full page error:', error);
          sendResponse({
            success: false,
            error: error.message || 'Failed to copy page',
          });
        });

      // Return true to indicate we'll send response asynchronously
      return true;
    }

    // Handle copy-selection message from popup
    if (
      request.action === 'copy-selection' &&
      request.tabId &&
      request.markdown
    ) {
      copyToClipboard(request.markdown, request.tabId, request.metadata)
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          console.error('Chrome Markdownify: Copy selection error:', error);
          sendResponse({
            success: false,
            error: error.message || 'Failed to copy selection',
          });
        });

      // Return true to indicate we'll send response asynchronously
      return true;
    }

    // Return false for other message types (no response needed)
    return false;
  }
);

// Add listener for when tabs are updated (e.g., navigation)
chrome.tabs.onUpdated.addListener(
  (
    _tabId: number,
    changeInfo: chrome.tabs.TabChangeInfo,
    tab: chrome.tabs.Tab
  ): void => {
    // We could inject content script here if needed, but it's already handled by manifest
    if (
      changeInfo.status === 'complete' &&
      tab.url &&
      !tab.url.startsWith('chrome://')
    ) {
      console.log(
        'Chrome Markdownify: Tab updated, content script should be available'
      );
    }
  }
);

console.log('Chrome Markdownify: Background service worker loaded');
