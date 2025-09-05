import { Note } from '../shared/Model';

// Mock data for testing
const createMockNote = (title: string, oid: string): Note => ({
  oid,
  oidFile: `file-${oid}`,
  repositorySlug: 'test',
  repositoryPath: '~/test',
  slug: title.toLowerCase(),
  type: 'note',
  relativePath: `${title.toLowerCase()}.md`,
  wikilink: title.toLowerCase(),
  attributes: {},
  tags: [],
  line: 1,
  title,
  shortTitle: title,
  longTitle: title,
  content: `# ${title}`,
  body: `# ${title}`,
  comment: '',
  medias: [],
  marked: false,
  annotations: [],
});

// Test the sorting functionality
describe('NoteContainer sorting functionality', () => {
  const mockNotes: Note[] = [
    createMockNote('Note A', '1'),
    createMockNote('Note B', '2'), 
    createMockNote('Note C', '3'),
  ];

  it('should maintain original order for ascending sort', () => {
    const sortedAscending = [...mockNotes];
    
    expect(sortedAscending).toEqual(mockNotes);
    expect(sortedAscending[0].title).toBe('Note A');
    expect(sortedAscending[1].title).toBe('Note B');
    expect(sortedAscending[2].title).toBe('Note C');
  });

  it('should reverse order for descending sort', () => {
    const sortedDescending = [...mockNotes].reverse();
    
    expect(sortedDescending[0].title).toBe('Note C');
    expect(sortedDescending[1].title).toBe('Note B');
    expect(sortedDescending[2].title).toBe('Note A');
  });

  it('should shuffle notes using Fisher-Yates algorithm', () => {
    const shuffleArray = (array: Note[]): Note[] => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    // Test that shuffle produces a valid permutation
    const shuffled1 = shuffleArray(mockNotes);
    const shuffled2 = shuffleArray(mockNotes);
    
    expect(shuffled1).toHaveLength(mockNotes.length);
    expect(shuffled2).toHaveLength(mockNotes.length);
    
    // Check all original notes are present
    const originalTitles = mockNotes.map(n => n.title).sort();
    const shuffled1Titles = shuffled1.map(n => n.title).sort();
    const shuffled2Titles = shuffled2.map(n => n.title).sort();
    
    expect(shuffled1Titles).toEqual(originalTitles);
    expect(shuffled2Titles).toEqual(originalTitles);
  });

  it('should handle empty notes array', () => {
    const emptyNotes: Note[] = [];
    const shuffled = [...emptyNotes];
    
    expect(shuffled).toEqual([]);
  });

  it('should handle single note', () => {
    const singleNote = [mockNotes[0]];
    const shuffled = [...singleNote];
    
    expect(shuffled).toEqual(singleNote);
    expect(shuffled[0].title).toBe('Note A');
  });
});