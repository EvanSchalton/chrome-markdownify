export interface PageMetadata {
  title: string;
  url: string;
  description?: string;
  author?: string;
  publishedTime?: string;
}

export interface ExtractedContent {
  html: string;
  text: string;
  metadata: PageMetadata;
}

export interface SelectionContent {
  html: string;
  text: string;
  context?: string;
}

class DOMExtractor {
  /**
   * Extract the full page content from the current document
   */
  public extractFullPage(): ExtractedContent {
    // Clone the body to avoid modifying the original
    const bodyClone = document.body.cloneNode(true) as HTMLElement;

    // Remove script and style elements
    this.removeUnwantedElements(bodyClone);

    // Get the main content area if it exists
    const mainContent = this.findMainContent(bodyClone) || bodyClone;

    return {
      html: mainContent.innerHTML,
      text: mainContent.innerText || mainContent.textContent || '',
      metadata: this.extractPageMetadata(),
    };
  }

  /**
   * Extract selected text with surrounding HTML context
   */
  public extractSelection(): SelectionContent | null {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const container = document.createElement('div');

    // Clone the contents of the selection
    const clonedContents = range.cloneContents();
    container.appendChild(clonedContents);

    // Clean up the cloned content
    this.removeUnwantedElements(container);

    // Get the parent context if available
    let context: string | undefined;
    const commonAncestor = range.commonAncestorContainer;

    if (commonAncestor && commonAncestor.nodeType === Node.ELEMENT_NODE) {
      const ancestorElement = commonAncestor as HTMLElement;
      const tagName = ancestorElement.tagName?.toLowerCase();
      context = tagName;
    }

    return {
      html: container.innerHTML,
      text: selection.toString(),
      context,
    };
  }

  /**
   * Extract metadata from the current page
   */
  public extractPageMetadata(): PageMetadata {
    const metadata: PageMetadata = {
      title: document.title || 'Untitled',
      url: window.location ? window.location.href : '',
    };

    // Try to get OpenGraph or meta description
    const descriptionMeta =
      document.querySelector('meta[property="og:description"]') ||
      document.querySelector('meta[name="description"]');

    if (descriptionMeta) {
      metadata.description =
        descriptionMeta.getAttribute('content') || undefined;
    }

    // Try to get author
    const authorMeta =
      document.querySelector('meta[name="author"]') ||
      document.querySelector('meta[property="article:author"]');

    if (authorMeta) {
      metadata.author = authorMeta.getAttribute('content') || undefined;
    }

    // Try to get published time
    const publishedMeta =
      document.querySelector('meta[property="article:published_time"]') ||
      document.querySelector('meta[name="publish_date"]');

    if (publishedMeta) {
      metadata.publishedTime =
        publishedMeta.getAttribute('content') || undefined;
    }

    return metadata;
  }

  /**
   * Extract content from a specific element selector
   */
  public extractFromSelector(selector: string): ExtractedContent | null {
    const element = document.querySelector(selector);

    if (!element) {
      return null;
    }

    const clonedElement = element.cloneNode(true) as HTMLElement;
    this.removeUnwantedElements(clonedElement);

    return {
      html: clonedElement.innerHTML,
      text: clonedElement.innerText || clonedElement.textContent || '',
      metadata: this.extractPageMetadata(),
    };
  }

  /**
   * Check if the content size exceeds a threshold (in bytes)
   */
  public checkContentSize(html: string, threshold: number = 1048576): boolean {
    // Convert to bytes (rough estimate)
    const sizeInBytes = new Blob([html]).size;
    return sizeInBytes > threshold;
  }

  /**
   * Remove unwanted elements from the DOM tree
   */
  private removeUnwantedElements(element: HTMLElement): void {
    // Remove script tags
    const scripts = element.querySelectorAll('script');
    scripts.forEach((script) => script.remove());

    // Remove style tags
    const styles = element.querySelectorAll('style');
    styles.forEach((style) => style.remove());

    // Remove hidden elements
    const hidden = element.querySelectorAll(
      '[style*="display: none"], [style*="display:none"]'
    );
    hidden.forEach((el) => el.remove());

    // Remove common ad/tracking elements
    const unwantedSelectors = [
      '.advertisement',
      '.ads',
      '.ad-container',
      '[class*="cookie-banner"]',
      '[class*="cookie-consent"]',
      '.social-share',
      '.newsletter-signup',
      'iframe[src*="youtube.com"]',
      'iframe[src*="twitter.com"]',
    ];

    unwantedSelectors.forEach((selector) => {
      const elements = element.querySelectorAll(selector);
      elements.forEach((el) => el.remove());
    });

    // Remove data attributes to reduce size
    const allElements = element.querySelectorAll('*');
    allElements.forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        if (attr.name.startsWith('data-')) {
          el.removeAttribute(attr.name);
        }
      });
    });
  }

  /**
   * Try to find the main content area of the page
   */
  private findMainContent(element: HTMLElement): HTMLElement | null {
    // Common main content selectors
    const mainSelectors = [
      'main',
      'article',
      '[role="main"]',
      '#main',
      '#content',
      '.main-content',
      '.content',
      '.post-content',
      '.entry-content',
      '.article-content',
      '.page-content',
    ];

    for (const selector of mainSelectors) {
      const mainElement = element.querySelector(selector) as HTMLElement;
      if (mainElement) {
        return mainElement;
      }
    }

    // If no main content found, try to find the largest content block
    const contentBlocks = element.querySelectorAll('div, section, article');
    let largestBlock: HTMLElement | null = null;
    let largestSize = 0;

    contentBlocks.forEach((block) => {
      const text =
        (block as HTMLElement).innerText ||
        (block as HTMLElement).textContent ||
        '';
      if (text.length > largestSize) {
        largestSize = text.length;
        largestBlock = block as HTMLElement;
      }
    });

    return largestBlock;
  }

  /**
   * Sanitize HTML to remove potentially harmful content
   */
  public sanitizeHtml(html: string): string {
    // Create a temporary element to parse the HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Remove script tags and event handlers
    const scripts = temp.querySelectorAll('script');
    scripts.forEach((script) => script.remove());

    // Remove all event handlers
    const allElements = temp.querySelectorAll('*');
    allElements.forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        if (attr.name.startsWith('on')) {
          el.removeAttribute(attr.name);
        }
      });
    });

    return temp.innerHTML;
  }
}

// Export singleton instance and class
export const domExtractor = new DOMExtractor();
export default DOMExtractor;
