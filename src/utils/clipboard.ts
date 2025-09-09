// Clipboard utility for Chrome Markdownify extension

export interface ClipboardMetadata {
  title: string;
  url: string;
  timestamp: string;
}

export interface ClipboardOptions {
  maxSize?: number; // Maximum size in bytes before triggering file download
  truncateAt?: number; // Size to truncate content at if too large
  useDownloadFallback?: boolean; // Whether to offer download as fallback
}

export interface ClipboardResult {
  success: boolean;
  method: 'clipboard' | 'download' | 'truncated';
  error?: string;
  filename?: string;
  originalSize?: number;
  finalSize?: number;
}

// Default configuration
const DEFAULT_OPTIONS: Required<ClipboardOptions> = {
  maxSize: 1048576, // 1MB
  truncateAt: 50000, // 50KB
  useDownloadFallback: true,
};

/**
 * Main clipboard utility class
 */
class ClipboardUtil {
  private options: Required<ClipboardOptions>;

  constructor(options: ClipboardOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Write content to clipboard with fallback options
   */
  async writeToClipboard(
    content: string,
    metadata?: ClipboardMetadata,
    options?: ClipboardOptions
  ): Promise<ClipboardResult> {
    const config = { ...this.options, ...options };
    const originalSize = this.calculateSize(content);

    try {
      // Check content size
      if (originalSize > config.maxSize && config.useDownloadFallback) {
        // Offer file download for very large content
        const filename = this.generateFilename(metadata?.title || 'content');
        await this.downloadFile(content, filename);

        return {
          success: true,
          method: 'download',
          filename,
          originalSize,
          finalSize: originalSize,
        };
      }

      // Try to write to clipboard directly
      if (originalSize <= config.truncateAt) {
        await this.writeDirectToClipboard(content);

        return {
          success: true,
          method: 'clipboard',
          originalSize,
          finalSize: originalSize,
        };
      }
      // Truncate content if it's too large but not worth downloading
      const truncatedContent = this.truncateContent(content, config.truncateAt);
      await this.writeDirectToClipboard(truncatedContent);

      return {
        success: true,
        method: 'truncated',
        originalSize,
        finalSize: this.calculateSize(truncatedContent),
      };
    } catch (error) {
      console.error('Clipboard utility: Error writing to clipboard:', error);

      // Try download fallback if enabled
      if (config.useDownloadFallback && metadata) {
        try {
          const filename = this.generateFilename(metadata.title);
          await this.downloadFile(content, filename);

          return {
            success: true,
            method: 'download',
            filename,
            originalSize,
            finalSize: originalSize,
            error: 'Clipboard failed, used download fallback',
          };
        } catch (downloadError) {
          return {
            success: false,
            method: 'clipboard',
            originalSize,
            error: `Clipboard and download both failed: ${downloadError}`,
          };
        }
      }

      return {
        success: false,
        method: 'clipboard',
        originalSize,
        error:
          error instanceof Error ? error.message : 'Unknown clipboard error',
      };
    }
  }

  /**
   * Write content directly to clipboard using the Clipboard API
   */
  private async writeDirectToClipboard(content: string): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(content);
    } else {
      // Fallback for older browsers or when Clipboard API is not available
      await this.fallbackCopyToClipboard(content);
    }
  }

  /**
   * Fallback clipboard method using document.execCommand (deprecated but still works)
   */
  private async fallbackCopyToClipboard(content: string): Promise<void> {
    const textArea = document.createElement('textarea');
    textArea.value = content;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (!successful) {
        throw new Error('execCommand copy failed');
      }
    } finally {
      document.body.removeChild(textArea);
    }
  }

  /**
   * Download content as a file
   */
  async downloadFile(content: string, filename: string): Promise<void> {
    try {
      // In Chrome extension context, use chrome.downloads API if available
      if (typeof chrome !== 'undefined' && chrome.downloads) {
        const blob = new Blob([content], {
          type: 'text/markdown;charset=utf-8',
        });
        const url = URL.createObjectURL(blob);

        await new Promise<void>((resolve, reject) => {
          chrome.downloads.download(
            {
              url,
              filename,
              saveAs: true,
            },
            (_downloadId) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                // Clean up the object URL after a delay
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                resolve();
              }
            }
          );
        });
      } else {
        // Fallback for web context
        const blob = new Blob([content], {
          type: 'text/markdown;charset=utf-8',
        });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the object URL
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Clipboard utility: Error downloading file:', error);
      throw new Error(`Failed to download file: ${error}`);
    }
  }

  /**
   * Generate a safe filename from title and timestamp
   */
  generateFilename(title?: string, extension: string = 'md'): string {
    const baseTitle = title || 'markdownified-content';

    // Sanitize title for filename
    const sanitized = baseTitle
      .replace(/[<>:"/\\|?*]/g, '-') // Replace invalid filename characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/[-_]{2,}/g, '_') // Replace multiple separators with single underscore
      .replace(/^[-_]+|[-_]+$/g, '') // Remove leading/trailing separators
      .substring(0, 100); // Limit length

    // Add timestamp
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19) // Get YYYY-MM-DDTHH:mm:ss
      .replace(/:/g, '-') // Replace colons for filename safety
      .replace('T', '_'); // Replace T with underscore

    return `${sanitized}_${timestamp}.${extension}`;
  }

  /**
   * Truncate content to specified size with a nice message
   */
  private truncateContent(content: string, maxSize: number): string {
    if (content.length <= maxSize) {
      return content;
    }

    const truncationMessage =
      '\n\n... (content truncated due to size limitations)';
    const availableSpace = maxSize - truncationMessage.length;

    if (availableSpace <= 0) {
      return truncationMessage;
    }

    return content.substring(0, availableSpace) + truncationMessage;
  }

  /**
   * Calculate content size in bytes
   */
  private calculateSize(content: string): number {
    return new Blob([content]).size;
  }

  /**
   * Format size for human readable display
   */
  static formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
  }

  /**
   * Check if content exceeds size threshold
   */
  static checkSize(content: string, threshold: number): boolean {
    return new Blob([content]).size > threshold;
  }

  /**
   * Get clipboard read permissions (if supported)
   */
  async hasClipboardReadPermission(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.permissions) {
      try {
        const permission = await navigator.permissions.query({
          name: 'clipboard-read' as PermissionName,
        });
        return permission.state === 'granted';
      } catch (error) {
        console.warn(
          'Clipboard utility: Cannot check clipboard read permission:',
          error
        );
      }
    }
    return false;
  }

  /**
   * Get clipboard write permissions (if supported)
   */
  async hasClipboardWritePermission(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.permissions) {
      try {
        const permission = await navigator.permissions.query({
          name: 'clipboard-write' as PermissionName,
        });
        return permission.state === 'granted';
      } catch (error) {
        console.warn(
          'Clipboard utility: Cannot check clipboard write permission:',
          error
        );
      }
    }
    return false;
  }
}

// Export singleton instance and class
export const clipboard = new ClipboardUtil();
export default ClipboardUtil;
