import { JSX } from 'react';

/**
 * Content component for Chrome Markdownify extension
 * This component is injected into web pages but typically remains hidden
 * It can be used for displaying notifications or UI elements if needed
 */
export default function Content(): JSX.Element {
  // The extension operates primarily through content scripts
  // This React component is available if we need to inject UI into pages
  return (
    <div id='chrome-markdownify-content' style={{ display: 'none' }}>
      {/* Hidden container for potential future UI elements */}
    </div>
  );
}
