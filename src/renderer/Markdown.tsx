import { marked } from 'marked';

type MarkdownProps = {
  // Content
  md: string;
};

export default function Markdown({ md }: MarkdownProps) {
  // Convert Markdown to HTML
  let html = marked.parse(md) as string;
  html = html.trim();
  // If `html` starts with `<p>`, and contains only one <p>, trim it to avoid a block tag for just one line!
  if (
    html.startsWith('<p>') &&
    html.endsWith('</p>') &&
    html.indexOf('<p>', 3) === -1
  ) {
    html = html.slice(3, -4); // Remove the <p> and </p> tags
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
