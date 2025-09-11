import { JSX, useEffect, useState } from 'react';

// Types for component state and props
interface PopupState {
  isLoading: boolean;
  currentAction: string | null;
  hasSelection: boolean;
  error: string | null;
  success: string | null;
  debugMode: boolean;
}

interface TabInfo {
  id?: number;
  url?: string;
  title?: string;
}

export default function Popup(): JSX.Element {
  const [state, setState] = useState<PopupState>({
    isLoading: false,
    currentAction: null,
    hasSelection: false,
    error: null,
    success: null,
    debugMode: false,
  });

  const [currentTab, setCurrentTab] = useState<TabInfo>({});

  // Load debug mode from chrome.storage
  useEffect(() => {
    chrome.storage.sync.get(['debugMode'], (result) => {
      const debugEnabled = result.debugMode || false;
      setState((prev) => ({ ...prev, debugMode: debugEnabled }));
      if (debugEnabled) {
        console.log(
          '[Markdownify Debug] Debug mode loaded from storage:',
          debugEnabled
        );
      }
    });
  }, []);

  // Debug logger - also check localStorage for immediate debugging
  const debug = (message: string, data?: any) => {
    if (state.debugMode) {
      console.log(`[Markdownify Debug] ${message}`, data || '');
    }
  };

  // Check for text selection and get current tab info on mount
  useEffect(() => {
    const initializePopup = async () => {
      try {
        debug('Initializing popup...');
        // Get current active tab
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });

        debug('Current tab:', tab);

        if (tab && tab.id) {
          setCurrentTab({
            id: tab.id,
            url: tab.url,
            title: tab.title,
          });

          // Check if tab is supported (not a chrome:// or extension page)
          if (
            !tab.url?.startsWith('chrome://') &&
            !tab.url?.startsWith('chrome-extension://')
          ) {
            // Check if there's a text selection
            try {
              debug('Checking for initial selection...');
              const result = await chrome.tabs.sendMessage(tab.id, {
                action: 'check-selection',
              });
              debug('Initial selection check result:', result);
              if (result && typeof result.hasSelection === 'boolean') {
                setState((prev) => ({
                  ...prev,
                  hasSelection: result.hasSelection,
                }));
              }
            } catch (e) {
              // Content script might not be injected yet, that's ok
              debug(
                'Initial selection check failed (content script not ready):',
                e
              );
            }
          } else {
            debug('Tab is restricted (chrome:// or extension page)');
          }
        }
      } catch (error) {
        console.error('Error initializing popup:', error);
      }
    };

    initializePopup();

    // Set up interval to check for selection changes
    const interval = setInterval(async () => {
      if (
        currentTab.id &&
        !currentTab.url?.startsWith('chrome://') &&
        !currentTab.url?.startsWith('chrome-extension://')
      ) {
        try {
          const result = await chrome.tabs.sendMessage(currentTab.id, {
            action: 'check-selection',
          });
          if (state.debugMode) {
            debug('Periodic selection check:', result);
          }
          if (result && typeof result.hasSelection === 'boolean') {
            setState((prev) => ({
              ...prev,
              hasSelection: result.hasSelection,
            }));
          }
        } catch (e) {
          // Silently ignore - content script might not be ready
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [currentTab.id, currentTab.url, state.debugMode, debug]);

  // Handle copy actions
  const handleCopy = async (isSelection: boolean = false) => {
    if (!currentTab.id) {
      debug('No tab ID available');
      return;
    }

    const action = isSelection ? 'get-selection' : 'get-full-page';
    debug(`Starting copy action: ${action}`);

    setState((prev) => ({
      ...prev,
      isLoading: true,
      currentAction: action,
      error: null,
      success: null,
    }));

    try {
      debug(`Sending message to content script: ${action}`);
      const response = await chrome.tabs.sendMessage(currentTab.id, { action });
      debug('Content script response:', response);

      if (response && response.success && response.markdown) {
        // Always log the markdown to console for debugging/fallback
        console.log('=== MARKDOWN OUTPUT (copy from here if needed) ===');
        console.log(response.markdown);
        console.log('=== END MARKDOWN OUTPUT ===');

        if (response.metadata) {
          debug('Metadata:', response.metadata);
        }
        if (response.contentSize) {
          debug(`Content size: ${response.contentSize} bytes`);
        }

        // Now send the markdown to background script to copy to clipboard
        debug('Sending copy request to background script...');
        const copyResponse = await chrome.runtime.sendMessage({
          action: isSelection ? 'copy-selection' : 'copy-full-page',
          tabId: currentTab.id,
          markdown: response.markdown,
          metadata: response.metadata,
        });

        if (copyResponse && copyResponse.success) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            currentAction: null,
            success: 'Copied to clipboard!',
          }));
          setTimeout(() => window.close(), 1200);
        } else {
          throw new Error(copyResponse?.error || 'Failed to copy to clipboard');
        }
      } else {
        const errorMsg = response?.error || 'Failed to get content';
        debug('Failed to get content:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('Copy error:', error);
      debug('Full error object:', error);

      // Provide more specific error messages
      let errorMessage = 'Failed to copy. ';
      if (error.message?.includes('Could not establish connection')) {
        errorMessage += 'Please refresh the page to load the extension.';
      } else if (error.message?.includes('Receiving end does not exist')) {
        errorMessage += 'Please refresh the page to enable the extension.';
      } else {
        errorMessage += 'Please refresh the page and try again.';
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        currentAction: null,
        error: errorMessage,
      }));
    }
  };

  // Handle download actions
  const handleDownload = async (isSelection: boolean = false) => {
    if (!currentTab.id) {
      debug('No tab ID available');
      return;
    }

    const action = isSelection ? 'download-selection' : 'download-full-page';
    debug(`Starting download action: ${action}`);

    setState((prev) => ({
      ...prev,
      isLoading: true,
      currentAction: action,
      error: null,
      success: null,
    }));

    try {
      if (isSelection) {
        // Get selection content first
        debug('Getting selection content for download...');
        const response = await chrome.tabs.sendMessage(currentTab.id, {
          action: 'get-selection',
        });
        debug('Selection content response:', response);

        if (response && response.success && response.markdown) {
          // Always log the markdown to console for debugging/fallback
          console.log('=== MARKDOWN OUTPUT (copy from here if needed) ===');
          console.log(response.markdown);
          console.log('=== END MARKDOWN OUTPUT ===');

          debug('Sending download request to background script...');
          await chrome.runtime.sendMessage({
            action: 'download-selection',
            tabId: currentTab.id,
            markdown: response.markdown,
            metadata: response.metadata,
          });
        } else {
          throw new Error('Failed to get selection');
        }
      } else {
        // Get full page content first
        debug('Getting full page content for download...');
        const response = await chrome.tabs.sendMessage(currentTab.id, {
          action: 'get-full-page',
        });
        debug('Full page content response:', response);

        if (response && response.success && response.markdown) {
          // Always log the markdown to console for debugging/fallback
          console.log('=== MARKDOWN OUTPUT (copy from here if needed) ===');
          console.log(response.markdown);
          console.log('=== END MARKDOWN OUTPUT ===');

          debug('Sending download request to background script...');
          await chrome.runtime.sendMessage({
            action: 'download-full-page',
            tabId: currentTab.id,
            markdown: response.markdown,
            metadata: response.metadata,
          });
        } else {
          throw new Error('Failed to get page content');
        }
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        currentAction: null,
        success: 'Download started!',
      }));
      setTimeout(() => window.close(), 1200);
    } catch (error: any) {
      console.error('Download error:', error);
      debug('Full error object:', error);

      setState((prev) => ({
        ...prev,
        isLoading: false,
        currentAction: null,
        error: 'Failed to download. Please refresh the page and try again.',
      }));
    }
  };

  // Check if current page is restricted
  const isRestricted =
    currentTab.url?.startsWith('chrome://') ||
    currentTab.url?.startsWith('chrome-extension://');

  // Check if it's a local file
  const isLocalFile = currentTab.url?.startsWith('file://');

  return (
    <div
      className='w-56 p-4'
      style={{ backgroundColor: '#f5f5dc', position: 'relative' }}
    >
      {/* Settings button in top-right corner */}
      <button
        type='button'
        aria-label='Open Settings'
        onClick={() => {
          chrome.runtime.openOptionsPage();
        }}
        style={{
          position: 'absolute',
          top: '8px',
          right: '0px',
          width: '20px',
          height: '20px',
          padding: '0',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          opacity: 0.6,
          color: '#2d5f3f',
        }}
        title='Open Settings'
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.6';
        }}
      >
        <svg
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
          style={{ width: '16px', height: '16px' }}
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
          />
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
          />
        </svg>
      </button>

      {/* Header - Logo and Title on same row */}
      <div
        className='mb-4 border-b pb-2'
        style={{
          borderColor: '#2d5f3f',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <img
          src='/icon48.png'
          alt='Markdownify'
          style={{ width: '32px', height: '32px' }}
        />
        <div>
          <div
            style={{
              color: '#2d5f3f',
              fontSize: '12px',
              fontWeight: 'bold',
              lineHeight: '1',
            }}
          >
            Chrome
          </div>
          <div
            style={{
              color: '#2d5f3f',
              fontSize: '12px',
              fontWeight: 'bold',
              lineHeight: '1',
            }}
          >
            Markdownify
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {state.error && (
        <div className='mb-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700'>
          {state.error}
        </div>
      )}

      {state.success && (
        <div className='mb-3 rounded border border-green-200 bg-green-50 p-2 text-xs text-green-700'>
          ✓ {state.success}
        </div>
      )}

      {isRestricted && (
        <div className='mb-3 rounded border border-yellow-200 bg-yellow-50 p-2 text-xs text-yellow-700'>
          Cannot convert Chrome system pages
        </div>
      )}

      {isLocalFile && (
        <div className='mb-3 rounded border border-yellow-200 bg-yellow-50 p-2 text-xs text-yellow-700'>
          Local file - reload after opening
        </div>
      )}

      {/* Buttons */}
      {!isRestricted && (
        <div className='space-y-3'>
          {/* Selection section - always show but disable when no selection */}
          <div style={{ opacity: state.hasSelection ? 1 : 0.5 }}>
            <h2
              style={{
                color: '#2d5f3f',
                textAlign: 'center',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '4px',
              }}
            >
              Selection
            </h2>
            <div
              style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}
            >
              <button
                type='button'
                onClick={() => handleCopy(true)}
                disabled={state.isLoading || !state.hasSelection}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  width: '65px',
                  padding: '8px 4px',
                  backgroundColor: state.hasSelection ? '#3b82f6' : '#9ca3af',
                  color: 'white',
                  borderRadius: '4px',
                  cursor:
                    state.hasSelection && !state.isLoading
                      ? 'pointer'
                      : 'not-allowed',
                  opacity: state.isLoading ? 0.5 : 1,
                  border: 'none',
                }}
                onMouseEnter={(e) => {
                  if (state.hasSelection && !state.isLoading) {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (state.hasSelection) {
                    e.currentTarget.style.backgroundColor = '#3b82f6';
                  }
                }}
              >
                <svg
                  style={{ width: '16px', height: '16px' }}
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3'
                  />
                </svg>
                <span style={{ fontSize: '10px', fontWeight: '500' }}>
                  {state.isLoading && state.currentAction === 'get-selection'
                    ? 'Copying'
                    : 'Copy'}
                </span>
              </button>
              <button
                type='button'
                onClick={() => handleDownload(true)}
                disabled={state.isLoading || !state.hasSelection}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  width: '65px',
                  padding: '8px 4px',
                  backgroundColor: state.hasSelection ? '#a855f7' : '#9ca3af',
                  color: 'white',
                  borderRadius: '4px',
                  cursor:
                    state.hasSelection && !state.isLoading
                      ? 'pointer'
                      : 'not-allowed',
                  opacity: state.isLoading ? 0.5 : 1,
                  border: 'none',
                }}
                onMouseEnter={(e) => {
                  if (state.hasSelection && !state.isLoading) {
                    e.currentTarget.style.backgroundColor = '#9333ea';
                  }
                }}
                onMouseLeave={(e) => {
                  if (state.hasSelection) {
                    e.currentTarget.style.backgroundColor = '#a855f7';
                  }
                }}
              >
                <svg
                  style={{ width: '16px', height: '16px' }}
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4'
                  />
                </svg>
                <span style={{ fontSize: '10px', fontWeight: '500' }}>
                  {state.isLoading &&
                  state.currentAction === 'download-selection'
                    ? 'Saving'
                    : 'Save'}
                </span>
              </button>
            </div>
          </div>

          {/* Full page section */}
          <div>
            <h2
              style={{
                color: '#2d5f3f',
                textAlign: 'center',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '4px',
              }}
            >
              Full Page
            </h2>
            <div
              style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}
            >
              <button
                type='button'
                onClick={() => handleCopy(false)}
                disabled={state.isLoading}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  width: '65px',
                  padding: '8px 4px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: state.isLoading ? 'not-allowed' : 'pointer',
                  opacity: state.isLoading ? 0.5 : 1,
                  border: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!state.isLoading) {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                }}
              >
                <svg
                  style={{ width: '16px', height: '16px' }}
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                  />
                </svg>
                <span style={{ fontSize: '10px', fontWeight: '500' }}>
                  {state.isLoading && state.currentAction === 'get-full-page'
                    ? 'Copying'
                    : 'Copy'}
                </span>
              </button>
              <button
                type='button'
                onClick={() => handleDownload(false)}
                disabled={state.isLoading}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  width: '65px',
                  padding: '8px 4px',
                  backgroundColor: '#a855f7',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: state.isLoading ? 'not-allowed' : 'pointer',
                  opacity: state.isLoading ? 0.5 : 1,
                  border: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!state.isLoading) {
                    e.currentTarget.style.backgroundColor = '#9333ea';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#a855f7';
                }}
              >
                <svg
                  style={{ width: '16px', height: '16px' }}
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4'
                  />
                </svg>
                <span style={{ fontSize: '10px', fontWeight: '500' }}>
                  {state.isLoading &&
                  state.currentAction === 'download-full-page'
                    ? 'Saving'
                    : 'Save'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
