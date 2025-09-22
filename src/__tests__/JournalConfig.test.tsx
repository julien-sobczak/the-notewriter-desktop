import { JournalConfig, RoutineConfig } from '../shared/Model';

describe('JournalConfig', () => {
  it('should create a valid journal config with routines', () => {
    const routine: RoutineConfig = {
      name: 'Morning Routine',
      template: '# Test\n\n<Input />',
    };

    const journal: JournalConfig = {
      name: 'My Diary',
      repository: 'main',
      path: 'journal/${year}/${year}-${month}-${day}.md',
      routines: [routine],
    };

    expect(journal.name).toBe('My Diary');
    expect(journal.repository).toBe('main');
    expect(journal.path).toBe('journal/${year}/${year}-${month}-${day}.md');
    expect(journal.routines).toHaveLength(1);
    expect(journal.routines[0].name).toBe('Morning Routine');
    expect(journal.routines[0].template).toContain('<Input />');
  });

  it('should support multiple routines', () => {
    const morning: RoutineConfig = {
      name: 'Morning Routine',
      template: '# Morning\n\n<Input />',
    };

    const evening: RoutineConfig = {
      name: 'Evening Routine',
      template: '# Evening\n\n<Input />',
    };

    const journal: JournalConfig = {
      name: 'Daily Journal',
      repository: 'life',
      path: 'journal/${year}/${month}/${day}.md',
      routines: [morning, evening],
    };

    expect(journal.routines).toHaveLength(2);
    expect(journal.routines[0].name).toBe('Morning Routine');
    expect(journal.routines[1].name).toBe('Evening Routine');
  });
});