import type {
  ExtractedContent,
  PageMetadata,
  SelectionContent,
} from './dom-extractor';
import { JSDOM } from 'jsdom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DOMExtractor from './dom-extractor';

// Mock window and document for testing
const dom = new JSDOM(
  `
<!DOCTYPE html>
<html>
<head>
  <title>Test Page Title</title>
  <meta name="description" content="This is a test page description">
  <meta name="author" content="John Doe">
  <meta property="article:published_time" content="2024-01-01T00:00:00Z">
  <meta property="og:description" content="OpenGraph description">
</head>
<body>
  <header>
    <h1>Header Title</h1>
    <nav>Navigation</nav>
  </header>
  
  <main>
    <article>
      <h2>Article Title</h2>
      <p>This is the main content of the article.</p>
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
      </ul>
      <table>
        <tr>
          <th>Header 1</th>
          <th>Header 2</th>
        </tr>
        <tr>
          <td>Data 1</td>
          <td>Data 2</td>
        </tr>
      </table>
    </article>
  </main>
  
  <div class="advertisement">Ad content</div>
  <div class="social-share">Social buttons</div>
  <script>console.log('script');</script>
  <style>.test { color: red; }</style>
  
  <footer>
    <p>Footer content</p>
  </footer>
</body>
</html>
`,
  { url: 'https://example.com/test' }
);

// Set up global variables
global.window = dom.window as any;
global.document = dom.window.document;
global.Node = dom.window.Node;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLTableElement = dom.window.HTMLTableElement;
global.HTMLImageElement = dom.window.HTMLImageElement;
global.Blob = class MockBlob {
  size: number;

  type: string = '';

  constructor(parts: any[]) {
    this.size = parts.join('').length;
  }

  arrayBuffer(): Promise<ArrayBuffer> {
    return Promise.resolve(new ArrayBuffer(0));
  }

  bytes(): Promise<Uint8Array> {
    return Promise.resolve(new Uint8Array(0));
  }

  slice(): Blob {
    return new MockBlob([]);
  }

  stream(): ReadableStream {
    return new ReadableStream();
  }

  text(): Promise<string> {
    return Promise.resolve('');
  }
} as any;

describe('DOMExtractor', () => {
  let extractor: DOMExtractor;

  beforeEach(() => {
    extractor = new DOMExtractor();

    // Reset the entire document HTML for each test
    document.documentElement.innerHTML = `
<head>
  <title>Test Page Title</title>
  <meta name="description" content="This is a test page description">
  <meta name="author" content="John Doe">
  <meta property="article:published_time" content="2024-01-01T00:00:00Z">
  <meta property="og:description" content="OpenGraph description">
</head>
<body>
  <header>
    <h1>Header Title</h1>
    <nav>Navigation</nav>
  </header>
  
  <main>
    <article>
      <h2>Article Title</h2>
      <p>This is the main content of the article.</p>
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
      </ul>
      <table>
        <tr>
          <th>Header 1</th>
          <th>Header 2</th>
        </tr>
        <tr>
          <td>Data 1</td>
          <td>Data 2</td>
        </tr>
      </table>
    </article>
  </main>
  
  <div class="advertisement">Ad content</div>
  <div class="social-share">Social buttons</div>
  <script>console.log('script');</script>
  <style>.test { color: red; }</style>
  
  <footer>
    <p>Footer content</p>
  </footer>
</body>
    `;
  });

  describe('extractFullPage', () => {
    it('should extract full page content with metadata', () => {
      const result: ExtractedContent = extractor.extractFullPage();

      expect(result).toHaveProperty('html');
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('metadata');

      expect(result.html).toContain('Article Title');
      expect(result.html).toContain('main content');
      expect(result.text).toContain('Article Title');
      expect(result.text).toContain('main content');

      expect(result.metadata).toMatchObject({
        title: 'Test Page Title',
        url: 'https://example.com/test',
      });
    });

    it('should remove unwanted elements', () => {
      const result: ExtractedContent = extractor.extractFullPage();

      // Should not contain script or style tags
      expect(result.html).not.toContain('<script>');
      expect(result.html).not.toContain('<style>');
      expect(result.html).not.toContain('console.log');

      // Should not contain ad elements
      expect(result.html).not.toContain('advertisement');
      expect(result.html).not.toContain('social-share');
    });

    it('should find main content area', () => {
      const result: ExtractedContent = extractor.extractFullPage();

      // Should prioritize main content over header/footer
      expect(result.html).toContain('<article>');
      expect(result.html).toContain('Article Title');
    });
  });

  describe('extractSelection', () => {
    it('should return null when no selection exists', () => {
      // Mock empty selection
      const mockSelection = {
        rangeCount: 0,
      };
      vi.spyOn(window, 'getSelection').mockReturnValue(mockSelection as any);

      const result = extractor.extractSelection();
      expect(result).toBeNull();
    });

    it('should extract selected content with context', () => {
      // Create a mock selection
      const mockRange = {
        cloneContents: vi.fn().mockReturnValue(document.createElement('div')),
        commonAncestorContainer: {
          nodeType: Node.ELEMENT_NODE,
          tagName: 'P',
        },
      };

      const mockSelection = {
        rangeCount: 1,
        getRangeAt: vi.fn().mockReturnValue(mockRange),
        toString: vi.fn().mockReturnValue('Selected text content'),
      };

      vi.spyOn(window, 'getSelection').mockReturnValue(mockSelection as any);

      const result: SelectionContent | null = extractor.extractSelection();

      expect(result).not.toBeNull();
      expect(result?.text).toBe('Selected text content');
      expect(result?.context).toBe('p');
    });
  });

  describe('extractPageMetadata', () => {
    it('should extract basic metadata', () => {
      const metadata: PageMetadata = extractor.extractPageMetadata();

      expect(metadata).toMatchObject({
        title: 'Test Page Title',
        url: 'https://example.com/test',
        description: 'OpenGraph description', // Should prefer og:description
        author: 'John Doe',
        publishedTime: '2024-01-01T00:00:00Z',
      });
    });

    it('should handle missing metadata gracefully', () => {
      // Remove meta tags
      document.querySelectorAll('meta').forEach((meta) => meta.remove());

      const metadata: PageMetadata = extractor.extractPageMetadata();

      expect(metadata).toMatchObject({
        title: 'Test Page Title',
        url: 'https://example.com/test',
      });
      expect(metadata.description).toBeUndefined();
      expect(metadata.author).toBeUndefined();
      expect(metadata.publishedTime).toBeUndefined();
    });

    it('should use fallback description when og:description is not available', () => {
      // Remove og:description
      const ogDesc = document.querySelector('meta[property="og:description"]');
      ogDesc?.remove();

      // Verify the meta description is still there
      const metaDesc = document.querySelector('meta[name="description"]');
      expect(metaDesc?.getAttribute('content')).toBe(
        'This is a test page description'
      );

      const metadata: PageMetadata = extractor.extractPageMetadata();

      expect(metadata.description).toBe('This is a test page description');
    });
  });

  describe('extractFromSelector', () => {
    it('should extract content from specific selector', () => {
      const result: ExtractedContent | null =
        extractor.extractFromSelector('article');

      expect(result).not.toBeNull();
      expect(result?.html).toContain('Article Title');
      expect(result?.html).toContain('main content');
      expect(result?.text).toContain('Article Title');
    });

    it('should return null for non-existent selector', () => {
      const result = extractor.extractFromSelector('.non-existent');
      expect(result).toBeNull();
    });

    it('should clean extracted content', () => {
      // Add script tag to article
      const article = document.querySelector('article');
      if (article) {
        article.innerHTML += '<script>alert("test");</script>';
      }

      const result: ExtractedContent | null =
        extractor.extractFromSelector('article');

      expect(result).not.toBeNull();
      expect(result?.html).not.toContain('<script>');
      expect(result?.html).not.toContain('alert');
    });
  });

  describe('checkContentSize', () => {
    it('should return false for small content', () => {
      const smallHtml = '<p>Small content</p>';
      const isLarge = extractor.checkContentSize(smallHtml, 1000);

      expect(isLarge).toBe(false);
    });

    it('should return true for large content', () => {
      const largeHtml = 'a'.repeat(2000); // 2KB of content
      const isLarge = extractor.checkContentSize(largeHtml, 1000);

      expect(isLarge).toBe(true);
    });

    it('should use default threshold when not specified', () => {
      const html = '<p>Test content</p>';
      const isLarge = extractor.checkContentSize(html);

      expect(isLarge).toBe(false); // Should be well under 1MB default
    });
  });

  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const dirtyHtml = '<p>Safe content</p><script>alert("danger");</script>';
      const cleaned = extractor.sanitizeHtml(dirtyHtml);

      expect(cleaned).toContain('<p>Safe content</p>');
      expect(cleaned).not.toContain('<script>');
      expect(cleaned).not.toContain('alert');
    });

    it('should remove event handlers', () => {
      const dirtyHtml = '<p onclick="alert(\'danger\')">Content</p>';
      const cleaned = extractor.sanitizeHtml(dirtyHtml);

      expect(cleaned).toContain('<p>Content</p>');
      expect(cleaned).not.toContain('onclick');
      expect(cleaned).not.toContain('alert');
    });

    it('should preserve safe HTML', () => {
      const safeHtml =
        '<h1>Title</h1><p>Paragraph with <strong>bold</strong> text</p>';
      const cleaned = extractor.sanitizeHtml(safeHtml);

      expect(cleaned).toBe(safeHtml);
    });
  });

  describe('findMainContent', () => {
    it('should find main element when present', () => {
      const bodyClone = document.body.cloneNode(true) as HTMLElement;
      const mainContent = (extractor as any).findMainContent(bodyClone);

      expect(mainContent?.tagName.toLowerCase()).toBe('main');
    });

    it('should find article when main is not present', () => {
      // Create a body clone with article element outside of main
      const bodyClone = document.createElement('body');
      bodyClone.innerHTML = `
        <header>
          <h1>Header Title</h1>
        </header>
        
        <article>
          <h2>Article Title</h2>
          <p>This is the main content of the article.</p>
        </article>
        
        <footer>
          <p>Footer content</p>
        </footer>
      `;

      const mainContent = (extractor as any).findMainContent(bodyClone);

      expect(mainContent?.tagName.toLowerCase()).toBe('article');
    });

    it('should find largest content block as fallback', () => {
      // Create a body clone with test content
      const bodyClone = document.createElement('div');
      bodyClone.innerHTML = `
        <div>Short content</div>
        <div>This is a much longer piece of content that should be selected as the main content area because it has significantly more text than the other div elements in this test case</div>
        <div>Medium content here that is longer than short but not as long as the target</div>
      `;

      const mainContent = (extractor as any).findMainContent(bodyClone);

      expect(mainContent).not.toBeNull();
      expect(mainContent?.textContent).toContain(
        'much longer piece of content'
      );
    });
  });

  describe('removeUnwantedElements', () => {
    it('should remove scripts, styles, and ads', () => {
      const element = document.createElement('div');
      element.innerHTML = `
        <p>Good content</p>
        <script>bad script</script>
        <style>bad style</style>
        <div class="advertisement">ad content</div>
        <div data-tracking="123">content with data attributes</div>
      `;

      (extractor as any).removeUnwantedElements(element);

      expect(element.innerHTML).toContain('Good content');
      expect(element.innerHTML).not.toContain('<script>');
      expect(element.innerHTML).not.toContain('<style>');
      expect(element.innerHTML).not.toContain('advertisement');
      expect(element.innerHTML).not.toContain('data-tracking');
    });

    it('should remove hidden elements', () => {
      const element = document.createElement('div');
      element.innerHTML = `
        <p>Visible content</p>
        <div style="display: none">Hidden content</div>
        <div style="display:none">Also hidden</div>
      `;

      (extractor as any).removeUnwantedElements(element);

      expect(element.innerHTML).toContain('Visible content');
      expect(element.innerHTML).not.toContain('Hidden content');
      expect(element.innerHTML).not.toContain('Also hidden');
    });
  });
});
