import { beforeEach, describe, expect, it } from 'vitest';

import MarkdownConverter, { converter } from './converter';

describe('MarkdownConverter', () => {
  let markdownConverter: MarkdownConverter;

  beforeEach(() => {
    markdownConverter = new MarkdownConverter();
  });

  describe('Basic HTML elements', () => {
    it('should convert headings correctly', () => {
      const html = '<h1>Heading 1</h1><h2>Heading 2</h2><h3>Heading 3</h3>';
      const result = markdownConverter.convert(html);
      expect(result).toBe('# Heading 1\n\n## Heading 2\n\n### Heading 3');
    });

    it('should convert paragraphs correctly', () => {
      const html = '<p>First paragraph</p><p>Second paragraph</p>';
      const result = markdownConverter.convert(html);
      expect(result).toBe('First paragraph\n\nSecond paragraph');
    });

    it('should convert links correctly', () => {
      const html = '<a href="https://example.com">Example Link</a>';
      const result = markdownConverter.convert(html);
      expect(result).toBe('[Example Link](https://example.com)');
    });

    it('should convert images with alt text', () => {
      const html = '<img src="https://example.com/image.jpg" alt="Test Image">';
      const result = markdownConverter.convert(html);
      expect(result).toBe('![Test Image](https://example.com/image.jpg)');
    });

    it('should convert images with title', () => {
      const html =
        '<img src="https://example.com/image.jpg" alt="Test" title="Image Title">';
      const result = markdownConverter.convert(html);
      expect(result).toBe(
        '![Test](https://example.com/image.jpg "Image Title")'
      );
    });

    it('should handle bold and italic text', () => {
      const html = '<strong>bold text</strong> and <em>italic text</em>';
      const result = markdownConverter.convert(html);
      expect(result).toBe('**bold text** and *italic text*');
    });

    it('should convert unordered lists', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>';
      const result = markdownConverter.convert(html);
      expect(result).toBe('-   Item 1\n-   Item 2\n-   Item 3');
    });

    it('should convert ordered lists', () => {
      const html = '<ol><li>First</li><li>Second</li><li>Third</li></ol>';
      const result = markdownConverter.convert(html);
      expect(result).toBe('1.  First\n2.  Second\n3.  Third');
    });
  });

  describe('Code blocks', () => {
    it('should convert inline code', () => {
      const html = 'Use <code>console.log()</code> to debug';
      const result = markdownConverter.convert(html);
      expect(result).toBe('Use `console.log()` to debug');
    });

    it('should convert code blocks with language', () => {
      const html =
        '<pre><code class="language-javascript">const x = 5;</code></pre>';
      const result = markdownConverter.convert(html);
      expect(result).toBe('```javascript\nconst x = 5;\n```');
    });

    it('should convert code blocks without language', () => {
      const html = '<pre><code>const x = 5;</code></pre>';
      const result = markdownConverter.convert(html);
      expect(result).toBe('```\nconst x = 5;\n```');
    });
  });

  describe('Tables (GFM)', () => {
    it('should convert simple tables', () => {
      const html = `
        <table>
          <tr><th>Header 1</th><th>Header 2</th></tr>
          <tr><td>Cell 1</td><td>Cell 2</td></tr>
          <tr><td>Cell 3</td><td>Cell 4</td></tr>
        </table>
      `;
      const result = markdownConverter.convert(html);
      expect(result).toContain('| Header 1 | Header 2 |');
      expect(result).toContain('| --- | --- |');
      expect(result).toContain('| Cell 1 | Cell 2 |');
      expect(result).toContain('| Cell 3 | Cell 4 |');
    });

    it('should escape pipe characters in table cells', () => {
      const html = `
        <table>
          <tr><th>Command</th><th>Description</th></tr>
          <tr><td>grep | sort</td><td>Pipe example</td></tr>
        </table>
      `;
      const result = markdownConverter.convert(html);
      expect(result).toContain('grep \\| sort');
    });
  });

  describe('Metadata handling', () => {
    it('should add metadata when includeMetadata is true', () => {
      const html = '<p>Content</p>';
      const result = markdownConverter.convert(html, {
        includeMetadata: true,
        baseUrl: 'https://example.com',
      });
      expect(result).toContain('Source: https://example.com');
      expect(result).toContain('Captured:');
      expect(result).toContain('---');
      expect(result).toContain('Content');
    });

    it('should convert with full metadata using convertWithMetadata', () => {
      const html = '<p>Test content</p>';
      const result = markdownConverter.convertWithMetadata(
        html,
        'Test Page',
        'https://example.com/page'
      );

      expect(result.markdown).toContain(
        'Source: [Test Page](https://example.com/page)'
      );
      expect(result.markdown).toContain('Captured:');
      expect(result.markdown).toContain('Test content');
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.title).toBe('Test Page');
      expect(result.metadata?.url).toBe('https://example.com/page');
      expect(result.metadata?.timestamp).toBeDefined();
    });
  });

  describe('Nested elements', () => {
    it('should handle nested lists', () => {
      const html = `
        <ul>
          <li>Item 1
            <ul>
              <li>Nested 1</li>
              <li>Nested 2</li>
            </ul>
          </li>
          <li>Item 2</li>
        </ul>
      `;
      const result = markdownConverter.convert(html);
      expect(result).toContain('-   Item 1');
      expect(result).toContain('    -   Nested 1');
      expect(result).toContain('    -   Nested 2');
      expect(result).toContain('-   Item 2');
    });

    it('should handle complex nested formatting', () => {
      const html =
        '<p>This is <strong>bold with <em>italic</em> inside</strong> text</p>';
      const result = markdownConverter.convert(html);
      expect(result).toBe('This is **bold with *italic* inside** text');
    });

    it('should handle blockquotes', () => {
      const html =
        '<blockquote><p>This is a quote</p><p>With multiple lines</p></blockquote>';
      const result = markdownConverter.convert(html);
      expect(result).toBe('> This is a quote\n> \n> With multiple lines');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty HTML', () => {
      const result = markdownConverter.convert('');
      expect(result).toBe('');
    });

    it('should handle HTML with only whitespace', () => {
      const result = markdownConverter.convert('   \n  \t  ');
      expect(result).toBe('');
    });

    it('should handle special characters', () => {
      const html = '<p>&lt;script&gt;alert("XSS")&lt;/script&gt;</p>';
      const result = markdownConverter.convert(html);
      expect(result).toBe('<script>alert("XSS")</script>');
    });

    it('should handle horizontal rules', () => {
      const html = '<p>Before</p><hr><p>After</p>';
      const result = markdownConverter.convert(html);
      expect(result).toBe('Before\n\n---\n\nAfter');
    });
  });

  describe('Singleton instance', () => {
    it('should export a working singleton instance', () => {
      const html = '<h1>Test</h1>';
      const result = converter.convert(html);
      expect(result).toBe('# Test');
    });
  });
});
