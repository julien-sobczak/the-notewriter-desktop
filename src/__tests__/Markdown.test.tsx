import React from 'react';
import { render } from '@testing-library/react';
import Markdown from '../renderer/Markdown';

describe('Markdown component with react-markdown', () => {
  test('renders simple markdown text', () => {
    const { container } = render(<Markdown md="**bold text**" />);
    expect(container.firstChild).toBeTruthy();
  });

  test('renders inline markdown', () => {
    const { container } = render(<Markdown md="*italic*" inline />);
    expect(container.firstChild).toBeTruthy();
  });

  test('renders URL as link', () => {
    const { getByRole } = render(<Markdown md="https://example.com" />);
    const link = getByRole('link');
    expect(link.getAttribute('href')).toBe('https://example.com');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.textContent).toBe('🔗');
  });

  test('handles markdown with custom blockquote', () => {
    const { container } = render(
      <Markdown md="> Quote text" />
    );
    expect(container.firstChild).toBeTruthy();
  });
});