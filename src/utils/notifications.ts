// Notifications utility for Chrome Markdownify extension

export interface NotificationOptions {
  title: string;
  message: string;
  iconUrl?: string;
  type?: chrome.notifications.TemplateType;
  priority?: number;
  buttons?: chrome.notifications.ButtonOptions[];
  progress?: number;
  items?: chrome.notifications.ItemOptions[];
  contextMessage?: string;
  requireInteraction?: boolean;
  silent?: boolean;
}

export interface DOMNotificationOptions {
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  method: 'chrome-api' | 'dom-fallback';
  error?: string;
}

// Default configuration
const DEFAULT_NOTIFICATION_OPTIONS: Partial<NotificationOptions> = {
  type: 'basic',
  iconUrl: '/icon48.png',
  priority: 1,
  requireInteraction: false,
  silent: false,
};

const DEFAULT_DOM_OPTIONS: Required<DOMNotificationOptions> = {
  title: '',
  message: '',
  type: 'info',
  duration: 3000,
  position: 'top-right',
};

/**
 * Main notifications utility class
 */
class NotificationsUtil {
  private notificationTimeouts = new Map<string, NodeJS.Timeout>();

  private domContainer: HTMLElement | null = null;

  /**
   * Show a success notification
   */
  async showSuccess(
    title: string,
    message: string,
    options: Partial<NotificationOptions> = {}
  ): Promise<NotificationResult> {
    const successOptions: NotificationOptions = {
      title,
      message,
      type: 'basic',
      iconUrl: '/icon48.png',
      priority: 1,
      ...options,
    };

    return this.show(successOptions);
  }

  /**
   * Show an error notification
   */
  async showError(
    title: string,
    message: string,
    options: Partial<NotificationOptions> = {}
  ): Promise<NotificationResult> {
    const errorOptions: NotificationOptions = {
      title,
      message,
      type: 'basic',
      iconUrl: '/icon48.png',
      priority: 2,
      requireInteraction: true,
      ...options,
    };

    return this.show(errorOptions);
  }

  /**
   * Show a download notification for large files
   */
  async showDownload(
    filename: string,
    size: string,
    options: Partial<NotificationOptions> = {}
  ): Promise<NotificationResult> {
    const downloadOptions: NotificationOptions = {
      title: 'Download Started',
      message: `Saving ${filename} (${size}) to your downloads folder`,
      type: 'basic',
      iconUrl: '/icon48.png',
      priority: 1,
      ...options,
    };

    return this.show(downloadOptions);
  }

  /**
   * Show a progress notification
   */
  async showProgress(
    title: string,
    message: string,
    progress: number,
    options: Partial<NotificationOptions> = {}
  ): Promise<NotificationResult> {
    const progressOptions: NotificationOptions = {
      title,
      message,
      type: 'progress',
      iconUrl: '/icon48.png',
      priority: 1,
      progress: Math.min(100, Math.max(0, progress)),
      ...options,
    };

    return this.show(progressOptions);
  }

  /**
   * Main notification display method
   */
  async show(options: NotificationOptions): Promise<NotificationResult> {
    try {
      // Try Chrome notifications API first
      if (await this.isChromeNotificationsAvailable()) {
        return await this.showChromeNotification(options);
      }
      // Fallback to DOM notifications
      return await this.showDOMNotification({
        title: options.title,
        message: options.message,
        type: this.mapNotificationType(options),
        duration: options.requireInteraction ? 0 : 3000,
      });
    } catch (error) {
      console.error(
        'Notifications utility: Error showing notification:',
        error
      );

      // Try DOM fallback if Chrome API fails
      try {
        return await this.showDOMNotification({
          title: options.title,
          message: options.message,
          type: 'error',
          duration: 5000,
        });
      } catch (fallbackError) {
        return {
          success: false,
          method: 'chrome-api',
          error: `Both Chrome API and DOM fallback failed: ${fallbackError}`,
        };
      }
    }
  }

  /**
   * Show notification using Chrome notifications API
   */
  private async showChromeNotification(
    options: NotificationOptions
  ): Promise<NotificationResult> {
    // Ensure required properties are present for Chrome API
    const finalOptions = {
      type: options.type || ('basic' as chrome.notifications.TemplateType),
      iconUrl:
        options.iconUrl ||
        DEFAULT_NOTIFICATION_OPTIONS.iconUrl ||
        '/icon48.png',
      title: options.title,
      message: options.message,
      priority: options.priority,
      requireInteraction: options.requireInteraction,
      silent: options.silent,
      buttons: options.buttons,
      progress: options.progress,
      items: options.items,
      contextMessage: options.contextMessage,
    };

    return new Promise((resolve) => {
      const notificationId = `chrome-markdownify-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      chrome.notifications.create(notificationId, finalOptions, (createdId) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            method: 'chrome-api',
            error: chrome.runtime.lastError.message,
          });
          return;
        }

        // Set up auto-dismiss timer if not requiring interaction
        if (!finalOptions.requireInteraction) {
          const timeout = setTimeout(() => {
            chrome.notifications.clear(createdId);
            this.notificationTimeouts.delete(createdId);
          }, 3000);

          this.notificationTimeouts.set(createdId, timeout);
        }

        resolve({
          success: true,
          notificationId: createdId,
          method: 'chrome-api',
        });
      });
    });
  }

  /**
   * Show notification using DOM injection
   */
  private async showDOMNotification(
    options: DOMNotificationOptions
  ): Promise<NotificationResult> {
    const finalOptions = { ...DEFAULT_DOM_OPTIONS, ...options };

    try {
      // Create notification container if it doesn't exist
      if (!this.domContainer) {
        this.domContainer = this.createNotificationContainer();
      }

      // Create notification element
      const notification = this.createNotificationElement(finalOptions);
      const notificationId = `dom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      notification.setAttribute('data-notification-id', notificationId);

      // Add to container
      this.domContainer.appendChild(notification);

      // Trigger enter animation
      setTimeout(() => {
        notification.classList.add('notification-enter');
      }, 10);

      // Set up auto-dismiss if duration is specified
      if (finalOptions.duration > 0) {
        setTimeout(() => {
          this.dismissDOMNotification(notification);
        }, finalOptions.duration);
      }

      return {
        success: true,
        notificationId,
        method: 'dom-fallback',
      };
    } catch (error) {
      return {
        success: false,
        method: 'dom-fallback',
        error:
          error instanceof Error
            ? error.message
            : 'Unknown DOM notification error',
      };
    }
  }

  /**
   * Create notification container for DOM notifications
   */
  private createNotificationContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'chrome-markdownify-notifications';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2147483647;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    document.body.appendChild(container);
    return container;
  }

  /**
   * Create individual notification element
   */
  private createNotificationElement(
    options: Required<DOMNotificationOptions>
  ): HTMLElement {
    const notification = document.createElement('div');
    notification.style.cssText = `
      background: ${this.getNotificationColor(options.type)};
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 8px;
      max-width: 350px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      pointer-events: auto;
      cursor: pointer;
      font-size: 14px;
      line-height: 1.4;
      position: relative;
      overflow: hidden;
    `;

    // Add content
    const title = document.createElement('div');
    title.style.cssText =
      'font-weight: 600; margin-bottom: 4px; font-size: 13px;';
    title.textContent = options.title;

    const message = document.createElement('div');
    message.style.cssText = 'font-size: 13px; opacity: 0.9;';
    message.textContent = options.message;

    notification.appendChild(title);
    notification.appendChild(message);

    // Add close button
    const closeButton = document.createElement('div');
    closeButton.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      width: 16px;
      height: 16px;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.2s;
      font-size: 14px;
      line-height: 16px;
      text-align: center;
    `;
    closeButton.innerHTML = '×';
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dismissDOMNotification(notification);
    });

    notification.appendChild(closeButton);

    // Add click handler to dismiss
    notification.addEventListener('click', () => {
      this.dismissDOMNotification(notification);
    });

    // Add enter animation class
    notification.classList.add('notification-enter');

    return notification;
  }

  /**
   * Dismiss a DOM notification with animation
   */
  private dismissDOMNotification(notification: HTMLElement): void {
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  /**
   * Get notification background color based on type
   */
  private getNotificationColor(type: DOMNotificationOptions['type']): string {
    const colors = {
      success: '#10B981',
      error: '#EF4444',
      warning: '#F59E0B',
      info: '#3B82F6',
    };
    return colors[type] || colors.info;
  }

  /**
   * Map Chrome notification options to DOM notification type
   */
  private mapNotificationType(
    options: NotificationOptions
  ): DOMNotificationOptions['type'] {
    if (options.priority && options.priority >= 2) {
      return 'error';
    }
    if (options.type === 'progress') {
      return 'info';
    }
    return 'success';
  }

  /**
   * Check if Chrome notifications API is available
   */
  private async isChromeNotificationsAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.notifications) {
        resolve(false);
        return;
      }

      // Test if we have notification permissions
      chrome.permissions.contains(
        { permissions: ['notifications'] },
        (hasPermission) => {
          resolve(hasPermission && !chrome.runtime.lastError);
        }
      );
    });
  }

  /**
   * Clear a specific notification
   */
  async clear(notificationId: string): Promise<boolean> {
    if (notificationId.startsWith('dom-')) {
      // Handle DOM notification
      const notification = document.querySelector(
        `[data-notification-id="${notificationId}"]`
      ) as HTMLElement;
      if (notification) {
        this.dismissDOMNotification(notification);
        return true;
      }
      return false;
    }
    // Handle Chrome notification
    return new Promise((resolve) => {
      if (chrome.notifications) {
        chrome.notifications.clear(notificationId, (wasCleared) => {
          // Clear timeout if it exists
          const timeout = this.notificationTimeouts.get(notificationId);
          if (timeout) {
            clearTimeout(timeout);
            this.notificationTimeouts.delete(notificationId);
          }
          resolve(wasCleared && !chrome.runtime.lastError);
        });
      } else {
        resolve(false);
      }
    });
  }

  /**
   * Clear all notifications
   */
  async clearAll(): Promise<void> {
    // Clear Chrome notifications
    if (chrome.notifications) {
      chrome.notifications.getAll((notifications) => {
        Object.keys(notifications).forEach((id) => {
          if (id.startsWith('chrome-markdownify-')) {
            chrome.notifications.clear(id);
          }
        });
      });
    }

    // Clear DOM notifications
    if (this.domContainer) {
      const domNotifications = this.domContainer.querySelectorAll(
        '[data-notification-id]'
      );
      domNotifications.forEach((notification) => {
        this.dismissDOMNotification(notification as HTMLElement);
      });
    }

    // Clear all timeouts
    this.notificationTimeouts.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.notificationTimeouts.clear();
  }

  /**
   * Get notification permissions status
   */
  async getPermissionStatus(): Promise<'granted' | 'denied' | 'default'> {
    if (typeof chrome !== 'undefined' && chrome.permissions) {
      return new Promise((resolve) => {
        chrome.permissions.contains(
          { permissions: ['notifications'] },
          (hasPermission) => {
            if (chrome.runtime.lastError) {
              resolve('denied');
            } else {
              resolve(hasPermission ? 'granted' : 'default');
            }
          }
        );
      });
    }
    return 'denied';
  }

  /**
   * Request notification permissions
   */
  async requestPermission(): Promise<boolean> {
    if (typeof chrome !== 'undefined' && chrome.permissions) {
      return new Promise((resolve) => {
        chrome.permissions.request(
          { permissions: ['notifications'] },
          (granted) => {
            resolve(granted && !chrome.runtime.lastError);
          }
        );
      });
    }
    return false;
  }
}

// Export singleton instance and class
export const notifications = new NotificationsUtil();
export default NotificationsUtil;
