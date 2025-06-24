import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { Note } from '../shared/Model';
import RenderedNote from '../renderer/RenderedNote';

describe('RenderedNote', () => {
  it('should render', () => {
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
    expect(render(<RenderedNote note={note} />)).toBeTruthy();
  });
});
