import { marked, Tokens } from 'marked';
import { useEffect } from 'react';

type MarkdownProps = {
  md: string;
  inline?: boolean;
};

// Custom renderer to customize the generated HTML
const renderer = new marked.Renderer();
// Add target="_blank" to all links
renderer.link = ({ href, title, text }: Tokens.Link): string => {
  const titleAttr = title ? ` title="${title}"` : '';
  return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
};
// Emphasize quotes author
renderer.blockquote = ({ text }: Tokens.Blockquote): string => {
  let result = '<blockquote class="markdown-quote">\n';
  text.split('\n').forEach((line) => {
    if (line.startsWith('— ') || line.startsWith('-- ')) {
      const cite = line.slice(2).trim();
      result += `<footer>— <cite>${cite}</cite></footer>\n`;
    } else if (line.trim() !== '') {
      result += `<p>${line}</p>\n`;
    }
  });
  return result;
};
// Add copy to clipboard button to code blocks
renderer.code = ({ text }: Tokens.Code): string => {
  // Generate a unique id for the code block
  const codeId = `codeblock-${Math.random().toString(36).slice(2, 11)}`;
  // Use a button with a data attribute for the code id
  return `
    <div class="markdown-codeblock-wrapper" style="position:relative;">
      <button
        class="copy-code-btn"
        data-code-id="${codeId}"
        style="position:absolute;top:8px;right:8px;z-index:2;"
        title="Copy code"
      >📋</button>
      <pre><code id="${codeId}">${text}</code></pre>
    </div>
  `;
};

export default function Markdown({ md, inline = false }: MarkdownProps) {
  // Preprocessing
  let mdProcessed = md.trim();
  // Check if md contains only an URL and if so, return a link
  if (/^https?:\/\/[^\s]+$/.test(md)) {
    mdProcessed = `<a href="${md}" target="_blank">🔗</a>`;
  }

  let html = marked.parse(mdProcessed, { renderer }) as string;
  html = html.trim();
  if (
    inline &&
    html.startsWith('<p>') &&
    html.endsWith('</p>') &&
    html.indexOf('<p>', 3) === -1
  ) {
    // Trim the leading and trailing <p> tags for inline rendering to avoid the block CSS element
    html = html.slice(3, -4);
  }

  useEffect(() => {
    const buttons = document.querySelectorAll('.copy-code-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const codeId = (e.currentTarget as HTMLElement).getAttribute(
          'data-code-id',
        );
        const code = codeId ? document.getElementById(codeId) : null;
        if (code) {
          navigator.clipboard.writeText(code.innerText);
        }
      });
    });
    // Cleanup
    return () => {
      buttons.forEach((btn) => {
        btn.removeEventListener('click', () => {});
      });
    };
  }, [html]);

  return (
    <span
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: html,
      }}
    />
  );
}
