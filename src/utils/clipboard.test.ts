import type { ClipboardMetadata, ClipboardResult } from './clipboard';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ClipboardUtil from './clipboard';

// Mock global objects
const mockClipboard = {
  writeText: vi.fn(),
  readText: vi.fn(),
};

const mockChrome = {
  downloads: {
    download: vi.fn(),
  },
  runtime: {
    lastError: null,
  },
};

const mockDocument = {
  createElement: vi.fn(),
  body: {
    appendChild: vi.fn(),
    removeChild: vi.fn(),
  },
  execCommand: vi.fn(),
};

// Mock URL.createObjectURL and revokeObjectURL
const mockURL = {
  createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
  revokeObjectURL: vi.fn(),
};

// Mock Blob
class MockBlob {
  size: number;

  type: string;

  constructor(parts: any[], options: { type?: string } = {}) {
    this.size = parts.join('').length;
    this.type = options.type || '';
  }
}

describe('ClipboardUtil', () => {
  let clipboardUtil: ClipboardUtil;

  beforeEach(() => {
    clipboardUtil = new ClipboardUtil();

    // Setup global mocks
    global.navigator = {
      clipboard: mockClipboard,
      permissions: {
        query: vi.fn(),
      },
    } as any;

    global.chrome = mockChrome as any;
    global.document = mockDocument as any;
    global.URL = mockURL as any;
    global.Blob = MockBlob as any;

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('writeToClipboard', () => {
    it('should write small content to clipboard successfully', async () => {
      const content = 'Small markdown content';
      mockClipboard.writeText.mockResolvedValueOnce(undefined);

      const result: ClipboardResult =
        await clipboardUtil.writeToClipboard(content);

      expect(result).toMatchObject({
        success: true,
        method: 'clipboard',
        originalSize: content.length,
        finalSize: content.length,
      });
      expect(mockClipboard.writeText).toHaveBeenCalledWith(content);
    });

    it('should handle clipboard write failure with download fallback', async () => {
      const content = 'Some markdown content';
      const metadata: ClipboardMetadata = {
        title: 'Test Page',
        url: 'https://example.com',
        timestamp: '2024-01-01T00:00:00Z',
      };

      mockClipboard.writeText.mockRejectedValueOnce(
        new Error('Clipboard access denied')
      );
      mockChrome.downloads.download.mockImplementationOnce(
        (_options: any, callback: any) => {
          callback(12345); // Mock download ID
        }
      );

      const result: ClipboardResult = await clipboardUtil.writeToClipboard(
        content,
        metadata
      );

      expect(result.success).toBe(true);
      expect(result.method).toBe('download');
      expect(result.filename).toContain('Test_Page');
      expect(result.filename).toContain('.md');
      expect(mockChrome.downloads.download).toHaveBeenCalled();
    });

    it('should truncate large content when within limits', async () => {
      const largeContent = 'a'.repeat(60000); // 60KB content
      const options = {
        truncateAt: 50000,
        maxSize: 1000000,
        useDownloadFallback: false,
      };

      mockClipboard.writeText.mockResolvedValueOnce(undefined);

      const result: ClipboardResult = await clipboardUtil.writeToClipboard(
        largeContent,
        undefined,
        options
      );

      expect(result.success).toBe(true);
      expect(result.method).toBe('truncated');
      expect(result.originalSize).toBe(60000);
      expect(result.finalSize).toBeLessThan(60000);
      expect(mockClipboard.writeText).toHaveBeenCalled();

      // Check that the content was truncated
      const truncatedContent = mockClipboard.writeText.mock.calls[0][0];
      expect(truncatedContent).toContain('content truncated due to size');
    });

    it('should offer download for very large content', async () => {
      const hugeContent = 'a'.repeat(2000000); // 2MB content
      const metadata: ClipboardMetadata = {
        title: 'Huge Document',
        url: 'https://example.com/huge',
        timestamp: '2024-01-01T00:00:00Z',
      };

      mockChrome.downloads.download.mockImplementationOnce(
        (_options: any, callback: any) => {
          callback(12345);
        }
      );

      const result: ClipboardResult = await clipboardUtil.writeToClipboard(
        hugeContent,
        metadata
      );

      expect(result.success).toBe(true);
      expect(result.method).toBe('download');
      expect(result.filename).toContain('Huge_Document');
      expect(mockChrome.downloads.download).toHaveBeenCalled();
      expect(mockClipboard.writeText).not.toHaveBeenCalled();
    });

    it('should handle case when both clipboard and download fail', async () => {
      const content = 'Some content';
      const metadata: ClipboardMetadata = {
        title: 'Test',
        url: 'https://example.com',
        timestamp: '2024-01-01T00:00:00Z',
      };

      mockClipboard.writeText.mockRejectedValueOnce(
        new Error('Clipboard failed')
      );
      mockChrome.downloads.download.mockImplementationOnce(
        (_options: any, callback: any) => {
          (mockChrome.runtime as any).lastError = {
            message: 'Download failed',
          };
          callback(null);
        }
      );

      const result: ClipboardResult = await clipboardUtil.writeToClipboard(
        content,
        metadata
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Download failed');
    });
  });

  describe('generateFilename', () => {
    it('should generate valid filename from title', () => {
      const title = 'My Great Article: A Story!';
      const filename = clipboardUtil.generateFilename(title);

      expect(filename).toMatch(
        /^My_Great_Article_A_Story!_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.md$/
      );
      expect(filename).not.toContain(':');
      expect(filename).not.toContain('/');
      expect(filename).not.toContain('<');
    });

    it('should handle empty or undefined title', () => {
      const filename = clipboardUtil.generateFilename();

      expect(filename).toMatch(
        /^markdownified-content_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.md$/
      );
    });

    it('should truncate very long titles', () => {
      const longTitle = 'a'.repeat(200);
      const filename = clipboardUtil.generateFilename(longTitle);

      // Should be reasonable length (title + timestamp + extension)
      expect(filename.length).toBeLessThan(150);
      expect(filename.endsWith('.md')).toBe(true);
    });

    it('should handle custom extension', () => {
      const filename = clipboardUtil.generateFilename('test', 'txt');

      expect(filename.endsWith('.txt')).toBe(true);
    });
  });

  describe('downloadFile', () => {
    it('should use Chrome downloads API when available', async () => {
      const content = 'Test content';
      const filename = 'test.md';

      mockChrome.downloads.download.mockImplementationOnce(
        (options: any, callback: any) => {
          expect(options.filename).toBe(filename);
          expect(options.saveAs).toBe(true);
          // Reset any previous lastError
          (mockChrome.runtime as any).lastError = null;
          callback(12345);
        }
      );

      await clipboardUtil.downloadFile(content, filename);

      expect(mockChrome.downloads.download).toHaveBeenCalled();
      expect(mockURL.createObjectURL).toHaveBeenCalled();
    });

    it('should fall back to DOM download when Chrome API not available', async () => {
      const content = 'Test content';
      const filename = 'test.md';

      // Remove chrome from global
      delete (global as any).chrome;

      const mockLink = {
        href: '',
        download: '',
        style: { display: '' },
        click: vi.fn(),
      };

      mockDocument.createElement.mockReturnValueOnce(mockLink);

      await clipboardUtil.downloadFile(content, filename);

      expect(mockDocument.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.download).toBe(filename);
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockDocument.body.appendChild).toHaveBeenCalledWith(mockLink);
      expect(mockDocument.body.removeChild).toHaveBeenCalledWith(mockLink);
    });
  });

  describe('static utility methods', () => {
    it('should format bytes correctly', () => {
      expect(ClipboardUtil.formatSize(0)).toBe('0 B');
      expect(ClipboardUtil.formatSize(1024)).toBe('1.0 KB');
      expect(ClipboardUtil.formatSize(1048576)).toBe('1.0 MB');
      expect(ClipboardUtil.formatSize(1536)).toBe('1.5 KB');
    });

    it('should check content size correctly', () => {
      const smallContent = 'small';
      const largeContent = 'a'.repeat(2000);

      expect(ClipboardUtil.checkSize(smallContent, 1000)).toBe(false);
      expect(ClipboardUtil.checkSize(largeContent, 1000)).toBe(true);
    });
  });

  describe('permissions', () => {
    it('should check clipboard read permission', async () => {
      const mockQuery = vi.fn().mockResolvedValueOnce({ state: 'granted' });
      global.navigator.permissions.query = mockQuery;

      const hasPermission = await clipboardUtil.hasClipboardReadPermission();

      expect(hasPermission).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith({ name: 'clipboard-read' });
    });

    it('should check clipboard write permission', async () => {
      const mockQuery = vi.fn().mockResolvedValueOnce({ state: 'denied' });
      global.navigator.permissions.query = mockQuery;

      const hasPermission = await clipboardUtil.hasClipboardWritePermission();

      expect(hasPermission).toBe(false);
      expect(mockQuery).toHaveBeenCalledWith({ name: 'clipboard-write' });
    });

    it('should handle permission check errors gracefully', async () => {
      const mockQuery = vi
        .fn()
        .mockRejectedValueOnce(new Error('Permission API not supported'));
      global.navigator.permissions.query = mockQuery;

      const hasPermission = await clipboardUtil.hasClipboardReadPermission();

      expect(hasPermission).toBe(false);
    });
  });

  describe('fallback clipboard methods', () => {
    it('should use fallback copy when Clipboard API not available', async () => {
      const content = 'Test content';

      // Remove clipboard API
      delete (global.navigator as any).clipboard;

      const mockTextArea = {
        value: '',
        style: { position: '', left: '', top: '' },
        focus: vi.fn(),
        select: vi.fn(),
      };

      mockDocument.createElement.mockReturnValueOnce(mockTextArea);
      mockDocument.execCommand.mockReturnValueOnce(true);

      await clipboardUtil.writeToClipboard(content);

      expect(mockDocument.createElement).toHaveBeenCalledWith('textarea');
      expect(mockTextArea.value).toBe(content);
      expect(mockTextArea.focus).toHaveBeenCalled();
      expect(mockTextArea.select).toHaveBeenCalled();
      expect(mockDocument.execCommand).toHaveBeenCalledWith('copy');
    });

    it('should handle fallback copy failure', async () => {
      const content = 'Test content';

      // Remove clipboard API
      delete (global.navigator as any).clipboard;

      const mockTextArea = {
        value: '',
        style: { position: '', left: '', top: '' },
        focus: vi.fn(),
        select: vi.fn(),
      };

      mockDocument.createElement.mockReturnValueOnce(mockTextArea);
      mockDocument.execCommand.mockReturnValueOnce(false); // Simulate failure

      const result = await clipboardUtil.writeToClipboard(content);

      expect(result.success).toBe(false);
      expect(result.error).toContain('execCommand copy failed');
    });
  });
});
