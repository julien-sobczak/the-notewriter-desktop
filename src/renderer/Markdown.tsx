import { marked, Tokens } from 'marked';

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

  return (
    <span
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: html,
      }}
    />
  );
}
