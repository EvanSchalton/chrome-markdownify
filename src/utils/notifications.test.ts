import type { MockedFunction } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import NotificationsUtil from './notifications';

// Mock chrome API
const mockChromeNotifications = {
  create: vi.fn(),
  clear: vi.fn(),
  getAll: vi.fn(),
};

const mockChromePermissions = {
  contains: vi.fn(),
  request: vi.fn(),
};

const mockChromeRuntime = {
  lastError: null,
};

const mockChrome = {
  notifications: mockChromeNotifications,
  permissions: mockChromePermissions,
  runtime: mockChromeRuntime,
};

// Mock DOM methods
const mockDocument = {
  createElement: vi.fn(),
  body: {
    appendChild: vi.fn(),
    removeChild: vi.fn(),
  },
  querySelector: vi.fn(),
  querySelectorAll: vi.fn(),
};

// Mock HTMLElement
class MockHTMLElement {
  style: { [key: string]: string } = {};

  children: MockHTMLElement[] = [];

  parentNode: MockHTMLElement | null = null;

  classList = {
    add: vi.fn(),
    remove: vi.fn(),
    contains: vi.fn(),
  };

  setAttribute = vi.fn();

  getAttribute = vi.fn();

  appendChild = vi.fn((child: MockHTMLElement) => {
    child.parentNode = this;
    this.children.push(child);
  });

  removeChild = vi.fn((child: MockHTMLElement) => {
    const index = this.children.indexOf(child);
    if (index > -1) {
      this.children.splice(index, 1);
      child.parentNode = null;
    }
  });

  addEventListener = vi.fn();

  removeEventListener = vi.fn();

  innerHTML = '';

  textContent = '';

  id = '';
}

// Mock setTimeout and clearTimeout
const mockTimeouts = new Map<number, Function>();
let timeoutId = 1;

const mockSetTimeout = vi.fn((callback: Function, _delay: number) => {
  const id = timeoutId++;
  mockTimeouts.set(id, callback);
  return id;
});

const mockClearTimeout = vi.fn((id: number) => {
  mockTimeouts.delete(id);
});

describe('NotificationsUtil', () => {
  let notificationsUtil: NotificationsUtil;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Set up global mocks
    global.chrome = mockChrome as any;
    global.document = mockDocument as any;
    global.setTimeout = mockSetTimeout as any;
    global.clearTimeout = mockClearTimeout as any;

    // Setup mock document.createElement to return MockHTMLElement
    mockDocument.createElement.mockImplementation(() => new MockHTMLElement());

    // Setup mock document.body
    mockDocument.body = new MockHTMLElement() as any;

    // Reset chrome mock defaults
    mockChromeRuntime.lastError = null;
    mockChromePermissions.contains.mockImplementation(
      (_permissions, callback) => {
        callback(true);
      }
    );

    // Create new instance for each test
    notificationsUtil = new NotificationsUtil();
  });

  afterEach(() => {
    // Clean up timeouts
    mockTimeouts.clear();
    timeoutId = 1;
  });

  describe('Chrome Notifications API', () => {
    it('should show success notification using Chrome API', async () => {
      mockChromeNotifications.create.mockImplementation(
        (_id, _options, callback) => {
          callback('test-notification-id');
        }
      );

      const result = await notificationsUtil.showSuccess(
        'Success!',
        'Operation completed successfully'
      );

      expect(result.success).toBe(true);
      expect(result.method).toBe('chrome-api');
      expect(result.notificationId).toBe('test-notification-id');
      expect(mockChromeNotifications.create).toHaveBeenCalledWith(
        expect.stringContaining('chrome-markdownify-'),
        expect.objectContaining({
          title: 'Success!',
          message: 'Operation completed successfully',
          type: 'basic',
          iconUrl: '/icon48.png',
          priority: 1,
        }),
        expect.any(Function)
      );
    });

    it('should show error notification with higher priority', async () => {
      mockChromeNotifications.create.mockImplementation(
        (_id, _options, callback) => {
          callback('error-notification-id');
        }
      );

      const result = await notificationsUtil.showError(
        'Error!',
        'Something went wrong'
      );

      expect(result.success).toBe(true);
      expect(result.method).toBe('chrome-api');
      expect(mockChromeNotifications.create).toHaveBeenCalledWith(
        expect.stringContaining('chrome-markdownify-'),
        expect.objectContaining({
          title: 'Error!',
          message: 'Something went wrong',
          type: 'basic',
          priority: 2,
          requireInteraction: true,
        }),
        expect.any(Function)
      );
    });

    it('should show download notification', async () => {
      mockChromeNotifications.create.mockImplementation(
        (_id, _options, callback) => {
          callback('download-notification-id');
        }
      );

      const result = await notificationsUtil.showDownload(
        'document.md',
        '2.5 MB'
      );

      expect(result.success).toBe(true);
      expect(result.method).toBe('chrome-api');
      expect(mockChromeNotifications.create).toHaveBeenCalledWith(
        expect.stringContaining('chrome-markdownify-'),
        expect.objectContaining({
          title: 'Download Started',
          message: 'Saving document.md (2.5 MB) to your downloads folder',
          type: 'basic',
          priority: 1,
        }),
        expect.any(Function)
      );
    });

    it('should show progress notification', async () => {
      mockChromeNotifications.create.mockImplementation(
        (_id, _options, callback) => {
          callback('progress-notification-id');
        }
      );

      const result = await notificationsUtil.showProgress(
        'Processing',
        'Converting content...',
        75
      );

      expect(result.success).toBe(true);
      expect(result.method).toBe('chrome-api');
      expect(mockChromeNotifications.create).toHaveBeenCalledWith(
        expect.stringContaining('chrome-markdownify-'),
        expect.objectContaining({
          title: 'Processing',
          message: 'Converting content...',
          type: 'progress',
          progress: 75,
        }),
        expect.any(Function)
      );
    });

    it('should handle Chrome API errors', async () => {
      (mockChromeRuntime as any).lastError = { message: 'Permission denied' };
      mockChromeNotifications.create.mockImplementation(
        (_id, _options, callback) => {
          callback('');
        }
      );

      const result = await notificationsUtil.showSuccess(
        'Success!',
        'Test message'
      );

      expect(result.success).toBe(true); // Should fallback to DOM
      expect(result.method).toBe('dom-fallback');
    });

    it('should set up auto-dismiss timer for non-interactive notifications', async () => {
      mockChromeNotifications.create.mockImplementation(
        (_id, _options, callback) => {
          callback('auto-dismiss-id');
        }
      );

      await notificationsUtil.showSuccess('Success!', 'Auto-dismiss test');

      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 3000);
    });

    it('should not set auto-dismiss for interactive notifications', async () => {
      mockChromeNotifications.create.mockImplementation(
        (_id, _options, callback) => {
          callback('interactive-id');
        }
      );

      await notificationsUtil.showError('Error!', 'Interactive error');

      // Should not set timeout for error notifications (requireInteraction: true)
      const timeoutCalls = (
        mockSetTimeout as MockedFunction<any>
      ).mock.calls.filter((call) => call[1] === 3000);
      expect(timeoutCalls).toHaveLength(0);
    });
  });

  describe('DOM Fallback Notifications', () => {
    beforeEach(() => {
      // Disable Chrome API for fallback tests
      mockChromePermissions.contains.mockImplementation(
        (_permissions, callback) => {
          callback(false);
        }
      );
    });

    it('should show DOM notification when Chrome API unavailable', async () => {
      const result = await notificationsUtil.showSuccess(
        'Success!',
        'DOM fallback test'
      );

      expect(result.success).toBe(true);
      expect(result.method).toBe('dom-fallback');
      expect(result.notificationId).toMatch(/^dom-\d+-[a-z0-9]+$/);
      expect(mockDocument.createElement).toHaveBeenCalled();
    });

    it('should create notification container on first use', async () => {
      await notificationsUtil.showSuccess('Test', 'Creating container');

      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(mockDocument.body.appendChild).toHaveBeenCalled();
    });

    it('should reuse existing container for subsequent notifications', async () => {
      await notificationsUtil.showSuccess('First', 'First notification');
      await notificationsUtil.showSuccess('Second', 'Second notification');

      // Container should only be created once
      const containerCalls = (
        mockDocument.createElement as MockedFunction<any>
      ).mock.calls.filter((call) => call[0] === 'div').length;

      // Should create container div + notification divs
      expect(containerCalls).toBeGreaterThan(1);
    });

    it('should set up auto-dismiss timer for DOM notifications', async () => {
      await notificationsUtil.showSuccess('Success!', 'Auto-dismiss DOM test');

      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 3000);
    });

    it('should handle different notification types with appropriate colors', async () => {
      const mockElement = new MockHTMLElement();
      mockDocument.createElement.mockReturnValue(mockElement as any);

      await notificationsUtil.showError('Error!', 'Error test');

      // Verify error styling was applied (DOM notifications map errors based on priority)
      expect(mockDocument.createElement).toHaveBeenCalled();
    });
  });

  describe('Auto-dismiss functionality', () => {
    it('should clear Chrome notification after timeout', async () => {
      mockChromeNotifications.create.mockImplementation(
        (_id, _options, callback) => {
          callback('timeout-test-id');
        }
      );

      await notificationsUtil.showSuccess('Success!', 'Timeout test');

      // Fast-forward timer
      const timeoutCallback = (mockSetTimeout as MockedFunction<any>).mock
        .calls[0][0] as Function;
      timeoutCallback();

      expect(mockChromeNotifications.clear).toHaveBeenCalledWith(
        'timeout-test-id'
      );
    });

    it('should dismiss DOM notification after timeout', async () => {
      mockChromePermissions.contains.mockImplementation(
        (_permissions, callback) => {
          callback(false);
        }
      );

      const mockElement = new MockHTMLElement();
      mockDocument.createElement.mockReturnValue(mockElement as any);

      await notificationsUtil.showSuccess('Success!', 'DOM timeout test');

      // Find and execute the timeout callback for DOM dismissal
      const dismissTimeoutCall = (
        mockSetTimeout as MockedFunction<any>
      ).mock.calls.find((call) => call[1] === 3000);

      expect(dismissTimeoutCall).toBeDefined();

      if (dismissTimeoutCall) {
        const timeoutCallback = dismissTimeoutCall[0] as Function;
        timeoutCallback();
      }

      // Verify element styles were set for dismissal
      expect(mockElement.style.transform).toBe('translateX(100%)');
      expect(mockElement.style.opacity).toBe('0');
    });
  });

  describe('Notification management', () => {
    it('should clear specific Chrome notification', async () => {
      mockChromeNotifications.clear.mockImplementation((_id, callback) => {
        callback(true);
      });

      const result = await notificationsUtil.clear('test-notification-id');

      expect(result).toBe(true);
      expect(mockChromeNotifications.clear).toHaveBeenCalledWith(
        'test-notification-id',
        expect.any(Function)
      );
    });

    it('should clear specific DOM notification', async () => {
      const mockElement = new MockHTMLElement();
      mockElement.getAttribute = vi.fn().mockReturnValue('dom-123-abc');
      mockDocument.querySelector.mockReturnValue(mockElement);

      const result = await notificationsUtil.clear('dom-123-abc');

      expect(result).toBe(true);
      expect(mockDocument.querySelector).toHaveBeenCalledWith(
        '[data-notification-id="dom-123-abc"]'
      );

      // Verify element dismissal styles were applied
      expect(mockElement.style.transform).toBe('translateX(100%)');
      expect(mockElement.style.opacity).toBe('0');
    });

    it('should clear all notifications', async () => {
      mockChromeNotifications.clear.mockImplementation((_id, callback) => {
        if (typeof callback === 'function') {
          callback(true);
        }
      });

      mockChromeNotifications.getAll.mockImplementation((callback) => {
        if (typeof callback === 'function') {
          callback({
            'chrome-markdownify-123': {},
            'other-extension-456': {},
            'chrome-markdownify-789': {},
          });
        }
      });

      const mockElements = [new MockHTMLElement(), new MockHTMLElement()];
      mockElements.forEach((el, i) => {
        el.getAttribute = vi.fn().mockReturnValue(`dom-${i}`);
      });

      const mockContainer = new MockHTMLElement() as any;
      mockContainer.querySelectorAll = vi.fn().mockReturnValue(mockElements);
      (notificationsUtil as any).domContainer = mockContainer;

      await notificationsUtil.clearAll();

      expect(mockChromeNotifications.clear).toHaveBeenCalledWith(
        'chrome-markdownify-123'
      );
      expect(mockChromeNotifications.clear).toHaveBeenCalledWith(
        'chrome-markdownify-789'
      );
      expect(mockChromeNotifications.clear).not.toHaveBeenCalledWith(
        'other-extension-456'
      );
    });
  });

  describe('Permission handling', () => {
    it('should check permission status when granted', async () => {
      mockChromePermissions.contains.mockImplementation(
        (_permissions, callback) => {
          callback(true);
        }
      );

      const status = await notificationsUtil.getPermissionStatus();

      expect(status).toBe('granted');
      expect(mockChromePermissions.contains).toHaveBeenCalledWith(
        { permissions: ['notifications'] },
        expect.any(Function)
      );
    });

    it('should check permission status when denied', async () => {
      mockChromePermissions.contains.mockImplementation(
        (_permissions, callback) => {
          callback(false);
        }
      );

      const status = await notificationsUtil.getPermissionStatus();

      expect(status).toBe('default');
    });

    it('should check permission status with runtime error', async () => {
      (mockChromeRuntime as any).lastError = {
        message: 'Permission check failed',
      };
      mockChromePermissions.contains.mockImplementation(
        (_permissions, callback) => {
          callback(false);
        }
      );

      const status = await notificationsUtil.getPermissionStatus();

      expect(status).toBe('denied');
    });

    it('should request notification permissions', async () => {
      mockChromePermissions.request.mockImplementation(
        (_permissions, callback) => {
          callback(true);
        }
      );

      const result = await notificationsUtil.requestPermission();

      expect(result).toBe(true);
      expect(mockChromePermissions.request).toHaveBeenCalledWith(
        { permissions: ['notifications'] },
        expect.any(Function)
      );
    });

    it('should handle permission request denial', async () => {
      mockChromePermissions.request.mockImplementation(
        (_permissions, callback) => {
          callback(false);
        }
      );

      const result = await notificationsUtil.requestPermission();

      expect(result).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle DOM fallback errors gracefully', async () => {
      mockChromePermissions.contains.mockImplementation(
        (_permissions, callback) => {
          callback(false);
        }
      );

      mockDocument.createElement.mockImplementation(() => {
        throw new Error('DOM creation failed');
      });

      const result = await notificationsUtil.showSuccess('Test', 'Error test');

      expect(result.success).toBe(false);
      expect(result.method).toBe('dom-fallback');
      expect(result.error).toContain('DOM creation failed');
    });

    it('should handle both Chrome API and DOM fallback failures', async () => {
      (mockChromeRuntime as any).lastError = { message: 'Chrome API failed' };
      mockChromeNotifications.create.mockImplementation(
        (_id, _options, callback) => {
          callback('');
        }
      );

      mockDocument.createElement.mockImplementation(() => {
        throw new Error('DOM also failed');
      });

      const result = await notificationsUtil.showSuccess(
        'Test',
        'Double failure test'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('DOM also failed');
    });
  });

  describe('Progress notifications', () => {
    it('should clamp progress values to valid range', async () => {
      mockChromeNotifications.create.mockImplementation(
        (_id, _options, callback) => {
          callback('progress-id');
        }
      );

      // Test over 100
      await notificationsUtil.showProgress('Test', 'Over 100%', 150);
      expect(mockChromeNotifications.create).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({ progress: 100 }),
        expect.any(Function)
      );

      // Test under 0
      await notificationsUtil.showProgress('Test', 'Under 0%', -50);
      expect(mockChromeNotifications.create).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({ progress: 0 }),
        expect.any(Function)
      );

      // Test normal value
      await notificationsUtil.showProgress('Test', 'Normal', 42);
      expect(mockChromeNotifications.create).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({ progress: 42 }),
        expect.any(Function)
      );
    });
  });
});
