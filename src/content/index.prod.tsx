import styles from '@assets/styles/index.css?inline';
import { converter } from '@utils/converter';
import createShadowRoot from '@utils/createShadowRoot';
import { domExtractor } from '@utils/dom-extractor';

import Content from './Content';

// Message types for communication with background script
interface MessageRequest {
  action: 'get-full-page' | 'get-selection' | 'check-selection';
  tabId?: number;
}

interface MessageResponse {
  success: boolean;
  markdown?: string;
  error?: string;
  hasSelection?: boolean;
  metadata?: {
    title: string;
    url: string;
    timestamp: string;
  };
  contentSize?: number;
}

// Content size threshold (1MB)
const CONTENT_SIZE_THRESHOLD = 1048576;

// Create shadow root for UI components
try {
  const root = createShadowRoot(styles);
  root.render(<Content />);
} catch (error) {
  console.warn(
    'Chrome Markdownify: Could not create shadow root UI, continuing without UI',
    error
  );
}

// Global debug mode flag
let debugMode = false;

// Load debug mode setting
chrome.storage.sync.get(['debugMode'], (result) => {
  debugMode = result.debugMode || false;
});

// Listen for debug mode changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.debugMode) {
    debugMode = changes.debugMode.newValue || false;
  }
});

/**
 * Handle messages from background script
 */
chrome.runtime.onMessage.addListener(
  (
    request: MessageRequest,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ): boolean => {
    if (debugMode) {
      console.log(
        'Chrome Markdownify Content Script: Received message:',
        request
      );
    }

    try {
      switch (request.action) {
        case 'get-full-page':
          handleFullPageRequest(sendResponse);
          break;
        case 'get-selection':
          handleSelectionRequest(sendResponse);
          break;
        case 'check-selection':
          handleCheckSelectionRequest(sendResponse);
          break;
        default:
          sendResponse({
            success: false,
            error: `Unknown action: ${request.action}`,
          });
          return false;
      }
    } catch (error) {
      console.error(
        'Chrome Markdownify Content Script: Error handling message:',
        error
      );
      sendResponse({
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
      return false;
    }

    // Return true to indicate we'll send response asynchronously
    return true;
  }
);

/**
 * Handle full page extraction and conversion
 */
async function handleFullPageRequest(
  sendResponse: (response: MessageResponse) => void
): Promise<void> {
  try {
    // Extract full page content
    const extractedContent = domExtractor.extractFullPage();

    // Check content size before processing
    if (
      domExtractor.checkContentSize(
        extractedContent.html,
        CONTENT_SIZE_THRESHOLD
      )
    ) {
      sendResponse({
        success: false,
        error:
          'Page content is too large (>1MB). Please try selecting specific content instead.',
      });
      return;
    }

    // Convert to markdown with metadata
    const conversionResult = converter.convertWithMetadata(
      extractedContent.html,
      extractedContent.metadata.title,
      extractedContent.metadata.url
    );

    // Calculate final content size
    const contentSize = new Blob([conversionResult.markdown]).size;

    sendResponse({
      success: true,
      markdown: conversionResult.markdown,
      metadata: conversionResult.metadata,
      contentSize,
    });

    if (debugMode) {
      console.log(
        'Chrome Markdownify Content Script: Full page converted successfully',
        {
          htmlSize: extractedContent.html.length,
          markdownSize: conversionResult.markdown.length,
          title: extractedContent.metadata.title,
          markdown: conversionResult.markdown,
        }
      );
    }
  } catch (error) {
    console.error(
      'Chrome Markdownify Content Script: Error converting full page:',
      error
    );
    sendResponse({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to convert page content',
    });
  }
}

/**
 * Handle selection extraction and conversion
 */
async function handleSelectionRequest(
  sendResponse: (response: MessageResponse) => void
): Promise<void> {
  try {
    // Extract selected content
    const selectedContent = domExtractor.extractSelection();

    if (!selectedContent) {
      sendResponse({
        success: false,
        error:
          'No content selected. Please select text on the page and try again.',
      });
      return;
    }

    // Check content size before processing
    if (
      domExtractor.checkContentSize(
        selectedContent.html,
        CONTENT_SIZE_THRESHOLD
      )
    ) {
      sendResponse({
        success: false,
        error:
          'Selected content is too large (>1MB). Please select less content.',
      });
      return;
    }

    // Get page metadata for context
    const pageMetadata = domExtractor.extractPageMetadata();

    // Convert selection to markdown with page context
    const markdown = converter.convert(selectedContent.html);

    // Add metadata header for selections
    const timestamp = new Date().toISOString();
    const metadataHeader = `Selection from: [${pageMetadata.title}](${pageMetadata.url})\nCaptured: ${timestamp}`;
    const fullMarkdown = `${metadataHeader}\n\n---\n\n${markdown}`;

    // Calculate final content size
    const contentSize = new Blob([fullMarkdown]).size;

    sendResponse({
      success: true,
      markdown: fullMarkdown,
      metadata: {
        title: `Selection from ${pageMetadata.title}`,
        url: pageMetadata.url,
        timestamp,
      },
      contentSize,
    });

    if (debugMode) {
      console.log(
        'Chrome Markdownify Content Script: Selection converted successfully',
        {
          htmlSize: selectedContent.html.length,
          textLength: selectedContent.text.length,
          markdownSize: fullMarkdown.length,
          context: selectedContent.context,
          markdown: fullMarkdown,
        }
      );
    }
  } catch (error) {
    console.error(
      'Chrome Markdownify Content Script: Error converting selection:',
      error
    );
    sendResponse({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to convert selected content',
    });
  }
}

/**
 * Handle check selection request - just checks if there's selected text
 */
function handleCheckSelectionRequest(
  sendResponse: (response: MessageResponse) => void
): void {
  try {
    const selection = window.getSelection();
    const hasSelection =
      selection !== null && selection.toString().trim().length > 0;

    sendResponse({
      success: true,
      hasSelection,
    });

    if (debugMode) {
      console.log('Chrome Markdownify Content Script: Selection check:', {
        hasSelection,
      });
    }
  } catch (error) {
    console.error(
      'Chrome Markdownify Content Script: Error checking selection:',
      error
    );
    sendResponse({
      success: false,
      hasSelection: false,
      error:
        error instanceof Error ? error.message : 'Failed to check selection',
    });
  }
}

/**
 * Track selection state and notify background script
 */
let lastSelectionState = false;

function checkAndUpdateSelection(): void {
  const selection = window.getSelection();
  const hasSelection =
    selection !== null && selection.toString().trim().length > 0;

  // Only send update if state changed
  if (hasSelection !== lastSelectionState) {
    lastSelectionState = hasSelection;

    // Notify background script to update context menus
    chrome.runtime
      .sendMessage({
        action: 'selection-changed',
        hasSelection,
      })
      .catch(() => {
        // Ignore errors - background script might not be ready
      });

    if (debugMode) {
      console.log(
        'Chrome Markdownify Content Script: Selection state changed:',
        hasSelection
      );
    }
  }
}

/**
 * Initialize content script
 */
function initContentScript(): void {
  // Check if we're in a valid context
  if (typeof window === 'undefined' || !document) {
    console.warn(
      'Chrome Markdownify Content Script: Invalid context, skipping initialization'
    );
    return;
  }

  // Skip initialization on chrome:// pages and other restricted URLs
  if (
    window.location.protocol === 'chrome:' ||
    window.location.protocol === 'chrome-extension:'
  ) {
    if (debugMode) {
      console.log(
        'Chrome Markdownify Content Script: Skipping restricted page'
      );
    }
    return;
  }

  // Set up selection monitoring
  document.addEventListener('selectionchange', checkAndUpdateSelection);
  document.addEventListener('mouseup', checkAndUpdateSelection);
  document.addEventListener('keyup', checkAndUpdateSelection);

  // Initial check
  checkAndUpdateSelection();

  if (debugMode) {
    console.log('Chrome Markdownify Content Script: Initialized successfully', {
      url: window.location.href,
      title: document.title,
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContentScript);
} else {
  initContentScript();
}
