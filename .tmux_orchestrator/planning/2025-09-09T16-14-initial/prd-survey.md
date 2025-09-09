# PRD Clarifying Questions - Chrome Markdownify Extension

## Problem/Goal

**Q: What is the main problem this extension solves? What pain point does it address?**
_Assumed Answer:_ Users often need to save or share web content in Markdown format for documentation, note-taking, or content creation purposes. Currently, they have to manually convert HTML content or use multiple tools, which is time-consuming and error-prone.

I want to be able to quickly grab webpage content to share with an LLM

## Target User

**Q: Who is the primary user of this extension? (e.g., developers, writers, researchers)**
_Assumed Answer:_ Technical writers, developers, content creators, and anyone who works with Markdown-based tools like GitHub, Obsidian, or static site generators.

## Core Functionality

**Q: Besides the basic copy-as-markdown feature, are there any additional functionalities you'd like?**
_Assumed Answer:_

- Copy entire page as markdown via toolbar icon click
- Copy selected text as markdown via right-click context menu
- Copy full page as markdown via right-click context menu (when no text selected)

## Markdown Conversion Details

**Q: How should the extension handle various HTML elements during conversion?**
_Assumed Answer:_

- Images: Convert to markdown image syntax with original URLs
- Links: Preserve as markdown links
- Tables: Convert to markdown table format
- Code blocks: Preserve with appropriate syntax highlighting hints if available
- Headers: Map H1-H6 to corresponding markdown headers

## Formatting Preferences

**Q: Are there specific markdown flavors or formatting preferences?**
_Assumed Answer:_ Use CommonMark/GitHub Flavored Markdown (GFM) as the default, as it's widely supported.

## Clipboard Behavior

**Q: After copying, should there be any visual feedback to confirm the action?**
_Assumed Answer:_ Yes, show a brief notification or badge update to confirm content was copied successfully.

## Edge Cases

**Q: How should the extension handle these scenarios?**

- **JavaScript-rendered content:** _Assumed:_ Convert the currently rendered DOM, not the initial HTML
- **Protected/paywalled content:** _Assumed:_ Only convert publicly visible content
- **Complex layouts (sidebars, ads):** _Assumed:_ Focus on main content, optionally allow users to select specific areas
- **Failed conversions:** _Assumed:_ Show error message and fall back to copying raw HTML

## URL Handling

**Q: Should the extension include the source URL in the copied markdown?**
_Assumed Answer:_ Yes, include the source URL as a reference at the top or bottom of the converted content (e.g., "Source: [Page Title](URL)")

## Performance

**Q: Are there any size limitations for pages that can be converted?**
_Assumed Answer:_ Implement reasonable limits (e.g., warn for pages over 1MB of content) to prevent browser freezing.

If we hit an upper limit we skip the clipboard and create a .md file and trigger a download instead. \*If this adds a lot of complexity we can skip this requirement for now.

## Settings/Configuration

**Q: Should users be able to customize the conversion behavior?**
_Assumed Answer:_ Start with sensible defaults for now

## Non-Goals

**Q: What should this extension explicitly NOT do?**
_Assumed Answer:_

- Save files directly to disk (just copy to clipboard) **if this is complex**
- Batch processing of multiple pages
- Cloud synchronization
- Content editing before copying
- PDF generation

## Success Metrics

**Q: How will you measure if this extension is successful?**

- Can I use it to download pages.
