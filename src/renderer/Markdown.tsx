/* eslint-disable jsx-a11y/media-has-caption */
/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/no-children-prop */
/* eslint-disable react/no-unstable-nested-components */
import { ReactNode, useRef } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import SyntaxHighlighter from 'react-syntax-highlighter';
import github from 'react-syntax-highlighter/dist/esm/styles/hljs/github';
import { Copy as CopyIcon, Link as LinkIcon } from '@phosphor-icons/react';

type MarkdownProps = {
  md: string;
  inline?: boolean;
};

export default function Markdown({ md, inline = false }: MarkdownProps) {
  // Check if md contains only an URL and if so, return a link
  let mdProcessed = md.trim();
  if (/^https?:\/\/[^\s]+$/.test(mdProcessed)) {
    mdProcessed = `<a href="${mdProcessed}" target="_blank">🔗</a>`;
  }

  mdProcessed = mdProcessed.replace(/file:/g, 'https://notewriter.app');

  const codeRef = useRef<HTMLDivElement>(null);
  const components: Components = {
    // Replace 🔗 by a consistent icon <Link/>
    a: ({ children, ...props }) => {
      if (
        children &&
        typeof children === 'string' &&
        children.trim() === '🔗'
      ) {
        return (
          // <a {...props} target="_blank" rel="noopener noreferrer">
          <a {...props}>
            <LinkIcon size={8} />
          </a>
        );
      }
      return <a {...props}>{children}</a>;
    },

    // Highlight authors in blockquotes
    blockquote: ({ children, ...props }) => {
      // Convert children to string to process citation formatting
      const childrenArray = Array.isArray(children) ? children : [children];
      const processedChildren: ReactNode[] = [];

      childrenArray.forEach((child: any) => {
        if (
          child?.props?.children &&
          typeof child.props.children === 'string'
        ) {
          const text = child.props.children;
          if (text.startsWith('— ') || text.startsWith('-- ')) {
            const cite = text.slice(2).trim();
            processedChildren.push(
              <footer key={`cite-${cite}`}>
                — <cite>{cite}</cite>
              </footer>,
            );
          } else {
            processedChildren.push(child);
          }
        } else {
          processedChildren.push(child);
        }
      });

      return <blockquote {...props}>{processedChildren}</blockquote>;
    },

    // Improve code blocks support (syntax highlighting, copy button, etc.)
    code(props: any) {
      const { children, className, ...rest } = props;
      const match = /language-(\w+)/.exec(className || '');

      const handleCopy = () => {
        if (codeRef.current) {
          const text = codeRef.current.innerText;
          navigator.clipboard.writeText(text);
        }
      };

      return match ? (
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={handleCopy}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 2,
              fontSize: '1rem',
              cursor: 'pointer',
            }}
            title="Copy code"
          >
            <CopyIcon />
          </button>
          <SyntaxHighlighter
            {...rest}
            PreTag="div"
            ref={codeRef}
            children={String(children).replace(/\n$/, '')}
            language={match[1]}
            style={github}
          />
        </div>
      ) : (
        <code {...rest} className={className}>
          {children}
        </code>
      );
    },

    // Restore file: URLs from placeholders
    img: ({ ...props }) => {
      const src = props.src?.replace('https://notewriter.app', 'file:') || '';
      return <img {...props} src={src} />;
    },
    audio: ({ ...props }) => {
      const src = props.src?.replace('https://notewriter.app', 'file:') || '';
      return <audio {...props} src={src} />;
    },
    video: ({ ...props }) => {
      const src = props.src?.replace('https://notewriter.app', 'file:') || '';
      return <video {...props} src={src} />;
    },
  };

  if (inline) {
    // eslint-disable-next-line react/jsx-no-useless-fragment
    components.p = ({ children }) => <>{children}</>; // No wrapper tag at all
  }

  return (
    <ReactMarkdown
      skipHtml={false}
      children={mdProcessed}
      // Enable GitHub Flavored Markdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[
        // Enable raw HTML support but allow dangerous content
        [rehypeRaw],
      ]}
      components={components}
    />
  );
}
