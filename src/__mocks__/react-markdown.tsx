import React from 'react';

// Mock ReactMarkdown component for testing
function MockReactMarkdown({ children }: { children: string }) {
  return <div data-testid="mock-markdown">{children}</div>;
}

export default MockReactMarkdown;
export const Components = {};
