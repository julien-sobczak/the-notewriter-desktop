import { marked, Tokens } from 'marked';

type MarkdownProps = {
  md: string;
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

export default function Markdown({ md }: MarkdownProps) {
  let html = marked.parse(md, { renderer }) as string;
  html = html.trim();
  if (
    html.startsWith('<p>') &&
    html.endsWith('</p>') &&
    html.indexOf('<p>', 3) === -1
  ) {
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
