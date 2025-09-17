import { determineNextReminder, Reminder } from '../shared/Model';

describe('determineNextReminder', () => {
  const baseReminder: Reminder = {
    oid: 'test-oid',
    fileOid: 'file-oid',
    noteOid: 'note-oid',
    repositorySlug: 'test-repo',
    repositoryPath: '/path/to/repo',
    relativePath: 'test.md',
    description: 'Test reminder',
    tag: '',
    nextPerformedAt: '2023-12-15T10:00:00.000Z'
  };

  const referenceDate = new Date('2023-12-15T10:00:00.000Z');

  it('should handle static date reminders', () => {
    const reminder = { ...baseReminder, tag: '#reminder-2024-02-01' };
    const result = determineNextReminder(reminder, referenceDate);
    expect(result).toEqual(new Date(2024, 1, 1)); // February 1, 2024
  });

  it('should handle yearly recurrence reminders', () => {
    const reminder = { ...baseReminder, tag: '#reminder-every-${year}-02-01' };
    const result = determineNextReminder(reminder, referenceDate);
    expect(result).toEqual(new Date(2024, 1, 1)); // February 1, 2024
  });

  it('should handle even year reminders', () => {
    const reminder = { ...baseReminder, tag: '#reminder-${even-year}-02-01' };
    const result = determineNextReminder(reminder, referenceDate);
    expect(result).toEqual(new Date(2024, 1, 1)); // Next even year: 2024
  });

  it('should handle odd year reminders', () => {
    const reminder = { ...baseReminder, tag: '#reminder-${odd-year}-02-01' };
    const result = determineNextReminder(reminder, referenceDate);
    expect(result).toEqual(new Date(2025, 1, 1)); // Next odd year: 2025
  });

  it('should handle monthly recurrence in specific year', () => {
    const reminder = { ...baseReminder, tag: '#reminder-every-2025-${month}-02' };
    const result = determineNextReminder(reminder, referenceDate);
    expect(result).toEqual(new Date(2025, 0, 2)); // January 2, 2025 (next month after December)
  });

  it('should handle odd months in specific year', () => {
    const reminder = { ...baseReminder, tag: '#reminder-every-2025-${odd-month}' };
    const result = determineNextReminder(reminder, referenceDate);
    expect(result).toEqual(new Date(2026, 1, 2)); // February 2, 2026 (next year since December is even)
  });

  it('should handle daily recurrence', () => {
    const reminder = { ...baseReminder, tag: '#reminder-every-${day}' };
    const result = determineNextReminder(reminder, referenceDate);
    expect(result).toEqual(new Date(2023, 11, 16)); // December 16, 2023
  });

  it('should handle Tuesday recurrence', () => {
    const reminder = { ...baseReminder, tag: '#reminder-every-${tuesday}' };
    const result = determineNextReminder(reminder, referenceDate);
    expect(result).toEqual(new Date(2023, 11, 19)); // Next Tuesday: December 19, 2023
  });

  it('should handle Sunday recurrence', () => {
    const reminder = { ...baseReminder, tag: '#reminder-every-${sunday}' };
    const result = determineNextReminder(reminder, referenceDate);
    expect(result).toEqual(new Date(2023, 11, 17)); // Next Sunday: December 17, 2023
  });

  it('should handle Friday recurrence when reference is Friday', () => {
    const fridayDate = new Date('2023-12-15T10:00:00.000Z'); // This is a Friday
    const reminder = { ...baseReminder, tag: '#reminder-every-${friday}' };
    const result = determineNextReminder(reminder, fridayDate);
    expect(result).toEqual(new Date(2023, 11, 22)); // Next Friday: December 22, 2023
  });

  it('should throw error for invalid weekday', () => {
    const reminder = { ...baseReminder, tag: '#reminder-every-${invalidday}' };
    expect(() => determineNextReminder(reminder, referenceDate)).toThrow('Invalid weekday: invalidday');
  });

  it('should return original nextPerformedAt for unparseable tags', () => {
    const reminder = { ...baseReminder, tag: '#reminder-invalid-format' };
    const result = determineNextReminder(reminder, referenceDate);
    expect(result).toEqual(new Date('2023-12-15T10:00:00.000Z'));
  });

  it('should handle edge case for monthly recurrence at year boundary', () => {
    const decemberDate = new Date('2024-12-15T10:00:00.000Z');
    const reminder = { ...baseReminder, tag: '#reminder-every-2024-${month}-15' };
    const result = determineNextReminder(reminder, decemberDate);
    expect(result).toEqual(new Date(2025, 0, 15)); // January 15, 2025
  });

  it('should handle odd month edge case within the same year', () => {
    const januaryDate = new Date('2025-01-15T10:00:00.000Z'); // January is odd month (index 0, but February is index 1)
    const reminder = { ...baseReminder, tag: '#reminder-every-2025-${odd-month}' };
    const result = determineNextReminder(reminder, januaryDate);
    expect(result).toEqual(new Date(2025, 3, 2)); // April 2, 2025 (next odd month after January)
  });
});