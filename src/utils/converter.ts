import TurndownService from 'turndown';

export interface ConversionOptions {
  includeMetadata?: boolean;
  baseUrl?: string;
}

export interface ConversionResult {
  markdown: string;
  metadata?: {
    title: string;
    url: string;
    timestamp: string;
  };
}

class MarkdownConverter {
  private turndownService: TurndownService;

  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      fence: '```',
      emDelimiter: '*',
      strongDelimiter: '**',
      linkStyle: 'inlined',
      linkReferenceStyle: 'full',
    });

    this.configureGFMTables();
    this.configureCustomRules();
  }

  private configureGFMTables(): void {
    // Add support for GitHub Flavored Markdown tables
    this.turndownService.addRule('table', {
      filter: ['table'],
      replacement(_content: string, node: Node) {
        const tableNode = node as HTMLTableElement;
        let markdown = '\n\n';

        // Process table rows
        const rows = Array.from(tableNode.querySelectorAll('tr'));
        if (rows.length === 0) return '';

        rows.forEach((row, rowIndex) => {
          const cells = Array.from(row.querySelectorAll('th, td'));
          const cellContents = cells.map((cell) => {
            const cellText = cell.textContent?.trim() || '';
            return cellText.replace(/\|/g, '\\|');
          });

          markdown += `| ${cellContents.join(' | ')} |\n`;

          // Add separator after header row
          if (rowIndex === 0) {
            const separator = cells.map(() => '---').join(' | ');
            markdown += `| ${separator} |\n`;
          }
        });

        return `${markdown}\n`;
      },
    });
  }

  private configureCustomRules(): void {
    // Handle bold/strong tags with proper whitespace preservation
    this.turndownService.addRule('strong', {
      filter: ['strong', 'b'],
      replacement(content: string) {
        if (!content.trim()) return '';

        // Capture leading and trailing whitespace
        const leadingWhitespace = content.match(/^(\s*)/)?.[1] || '';
        const trailingWhitespace = content.match(/(\s*)$/)?.[1] || '';

        // Get the trimmed content
        const trimmedContent = content.trim();

        // Move whitespace outside the bold markers
        return `${leadingWhitespace}**${trimmedContent}**${trailingWhitespace}`;
      },
    });

    // Handle italic/emphasis tags with proper whitespace preservation
    this.turndownService.addRule('emphasis', {
      filter: ['em', 'i'],
      replacement(content: string) {
        if (!content.trim()) return '';

        // Capture leading and trailing whitespace
        const leadingWhitespace = content.match(/^(\s*)/)?.[1] || '';
        const trailingWhitespace = content.match(/(\s*)$/)?.[1] || '';

        // Get the trimmed content
        const trimmedContent = content.trim();

        // Move whitespace outside the italic markers
        return `${leadingWhitespace}*${trimmedContent}*${trailingWhitespace}`;
      },
    });

    // Handle code blocks with language hints
    this.turndownService.addRule('fencedCodeBlock', {
      filter(node): boolean {
        return (
          node.nodeName === 'PRE' &&
          node.firstChild !== null &&
          node.firstChild.nodeName === 'CODE'
        );
      },
      replacement(_content: string, node: Node, _options: any) {
        const codeNode = (node as HTMLElement).firstChild as HTMLElement;
        const className = codeNode.getAttribute('class') || '';
        const language = className.match(/language-(\w+)/)?.[1] || '';

        return `\n\n\`\`\`${language}\n${codeNode.textContent}\n\`\`\`\n\n`;
      },
    });

    // Better handling of images with alt text
    this.turndownService.addRule('image', {
      filter: 'img',
      replacement(_content: string, node: Node) {
        const img = node as HTMLImageElement;
        const alt = img.alt || 'image';
        const src = img.src || '';
        const title = img.title ? ` "${img.title}"` : '';

        return src ? `![${alt}](${src}${title})` : '';
      },
    });
  }

  public convert(html: string, options: ConversionOptions = {}): string {
    let markdown = this.turndownService.turndown(html);

    // Light post-processing for any remaining formatting issues
    markdown = this.cleanupMarkdown(markdown);

    if (options.includeMetadata) {
      const metadata = this.generateMetadata(options.baseUrl);
      markdown = `${metadata}\n\n---\n\n${markdown}`;
    }

    return markdown;
  }

  public convertWithMetadata(
    html: string,
    title: string,
    url: string
  ): ConversionResult {
    const timestamp = new Date().toISOString();
    const metadata = `Source: [${title}](${url})\nCaptured: ${timestamp}`;
    let markdown = this.turndownService.turndown(html);

    // Light post-processing for any remaining formatting issues
    markdown = this.cleanupMarkdown(markdown);

    return {
      markdown: `${metadata}\n\n---\n\n${markdown}`,
      metadata: {
        title,
        url,
        timestamp,
      },
    };
  }

  private cleanupMarkdown(markdown: string): string {
    let result = markdown;

    // Fix headers with trailing spaces or formatting
    result = result.replace(/^(#{1,6})\s+(.+?)\s*$/gm, '$1 $2');

    // Clean up excessive newlines (more than 2 consecutive)
    result = result.replace(/\n{3,}/g, '\n\n');

    // Clean up any trailing spaces at the end of lines
    result = result.replace(/ +$/gm, '');

    return result;
  }

  private generateMetadata(url?: string): string {
    const timestamp = new Date().toISOString();
    const metadata = [`Captured: ${timestamp}`];

    if (url) {
      metadata.unshift(`Source: ${url}`);
    }

    return metadata.join('\n');
  }

  public setOption(key: string, value: any): void {
    (this.turndownService.options as any)[key] = value;
  }
}

// Export singleton instance and class
export const converter = new MarkdownConverter();
export default MarkdownConverter;
