import '@testing-library/jest-dom';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import { Note } from '../shared/Model';
import RenderedNote from '../renderer/RenderedNote';

// Mock the ConfigContext
const mockConfig = {
  static: { repositories: [] },
  dynamic: { bookmarks: [] },
  repositories: {},
};

const mockDispatch = jest.fn();

jest.mock('../renderer/ConfigContext', () => ({
  ConfigContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: () => ({
    config: mockConfig,
    dispatch: mockDispatch,
  }),
}));

describe('RenderedNote', () => {
  const note: Note = {
    oid: 'fc6da20f-7eb2-4dd4-b19f-55973400e6af',
    oidFile: 'e6bb9f43-6381-4a1a-89a3-5d1024e1f994',
    repositorySlug: 'life',
    repositoryPath: '~/Documents/life',
    type: 'quote',
    slug: 'quotes-general',
    relativePath: 'references/quotes/general.md',
    wikilink: 'references/quote/general#Quote: Aristotle on Wisdom',
    attributes: {
      kind: 'quote',
    },
    tags: ['wisdom'],
    line: 3,
    title: 'Quote: Aristotle on Wisdom',
    shortTitle: 'Aristotle on Wisdom',
    longTitle: 'General / Quote: Aristotle on Wisdom',
    content: `Wisdom is the reward you get for a lifetime of listening when you'd rather have been talking.`,
    body: `Wisdom is the reward you get for a lifetime of listening when you'd rather have been talking.`,
    comment: '',
    medias: [],
    marked: false,
    annotations: [],
  };

  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it('should render', () => {
    expect(render(<RenderedNote note={note} />)).toBeTruthy();
  });

  it('should create bookmark with longTitle when handleBookmark is called', () => {
    const component = render(<RenderedNote note={note} />);

    // Find and click the bookmark button
    const bookmarkButton =
      component.container.querySelector('[title="Bookmark"]');
    expect(bookmarkButton).toBeTruthy();

    fireEvent.click(bookmarkButton!);

    // Verify that dispatch was called with the correct bookmark data
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'add-bookmark',
      payload: {
        repositorySlug: 'life',
        noteOID: 'fc6da20f-7eb2-4dd4-b19f-55973400e6af',
        noteType: 'quote',
        noteLongTitle: 'General / Quote: Aristotle on Wisdom', // Should use longTitle, not title
        noteRelativePath: 'references/quotes/general.md',
        noteLine: 3,
      },
    });
  });
});
