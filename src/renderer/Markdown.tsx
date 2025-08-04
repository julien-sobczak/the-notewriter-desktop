import React, { useEffect, useRef } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';

type MarkdownProps = {
  md: string;
  inline?: boolean;
};

// Custom components for react-markdown
const components: Components = {
  // Add target="_blank" to all links
  // eslint-disable-next-line react/jsx-props-no-spreading
  a: ({ href, title, children, ...props }) => (
    <a
      href={href}
      title={title}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  // Emphasize quotes author
  // eslint-disable-next-line react/jsx-props-no-spreading
  blockquote: ({ children, ...props }) => {
    // Convert children to string to process citation formatting
    const childrenArray = Array.isArray(children) ? children : [children];
    const processedChildren: React.ReactNode[] = [];

    childrenArray.forEach((child: any, index: number) => {
      if (child?.props?.children && typeof child.props.children === 'string') {
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

    return (
      <blockquote className="markdown-quote" {...props}>
        {processedChildren}
      </blockquote>
    );
  },
  // Add copy to clipboard button to code blocks
  // eslint-disable-next-line react/jsx-props-no-spreading
  code: ({ children, className, ...props }) => {
    const isCodeBlock = className?.includes('language-');
    if (isCodeBlock) {
      // Generate a unique id for the code block
      const codeId = `codeblock-${Math.random().toString(36).slice(2, 11)}`;
      return (
        <div
          className="markdown-codeblock-wrapper"
          style={{ position: 'relative' }}
        >
          <button
            className="copy-code-btn"
            data-code-id={codeId}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              zIndex: 2,
            }}
            title="Copy code"
            type="button"
          >
            📋
          </button>
          <pre>
            {/* eslint-disable-next-line react/jsx-props-no-spreading */}
            <code id={codeId} className={className} {...props}>
              {children}
            </code>
          </pre>
        </div>
      );
    }
    return (
      /* eslint-disable-next-line react/jsx-props-no-spreading */
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  // Handle paragraph rendering
  p: ({ children }) => children,
};

// Inline paragraph component for inline rendering
const inlineComponents: Components = {
  ...components,
  p: ({ children }) => React.createElement(React.Fragment, {}, children),
};

export default function Markdown({ md, inline = false }: MarkdownProps) {
  const containerRef = useRef<HTMLSpanElement>(null);

  // Preprocessing
  const mdProcessed = md.trim();
  const isUrlOnly = /^https?:\/\/[^\s]+$/.test(md);

  // Setup copy-to-clipboard functionality
  useEffect(() => {
    if (!containerRef.current || isUrlOnly) return undefined;

    const buttons = containerRef.current.querySelectorAll('.copy-code-btn');
    const handleCopyClick = (e: Event) => {
      const codeId = (e.currentTarget as HTMLElement).getAttribute(
        'data-code-id',
      );
      const code = codeId ? document.getElementById(codeId) : null;
      if (code) {
        navigator.clipboard.writeText(code.innerText);
      }
    };

    buttons.forEach((btn) => {
      btn.addEventListener('click', handleCopyClick);
    });

    // Cleanup
    return () => {
      buttons.forEach((btn) => {
        btn.removeEventListener('click', handleCopyClick);
      });
    };
  }, [mdProcessed, isUrlOnly]);

  // Check if md contains only an URL and if so, return a link
  if (isUrlOnly) {
    return (
      <span ref={containerRef}>
        <a href={md} target="_blank" rel="noopener noreferrer">
          🔗
        </a>
      </span>
    );
  }

  // For inline rendering, we use a custom component that doesn't wrap in paragraphs
  const finalComponents = inline ? inlineComponents : components;

  return (
    <span ref={containerRef}>
      <ReactMarkdown components={finalComponents}>{mdProcessed}</ReactMarkdown>
    </span>
  );
}
