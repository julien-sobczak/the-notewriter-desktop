import { marked, Tokens } from 'marked';

type MarkdownProps = {
  md: string;
};

// Custom renderer to add target="_blank" to all links
const renderer = new marked.Renderer();
renderer.link = ({ href, title, text }: Tokens.Link): string => {
  const titleAttr = title ? ` title="${title}"` : '';
  return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
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
