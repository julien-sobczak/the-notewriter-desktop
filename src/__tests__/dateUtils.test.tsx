import { formatDate, formatMemoryDate } from '../renderer/dateUtils';

// Mock the current date to have consistent tests
const mockCurrentDate = new Date('2023-12-15T10:00:00.000Z');
const originalNow = Date.now;

beforeEach(() => {
  Date.now = jest.fn(() => mockCurrentDate.getTime());
  global.Date = jest.fn((...args) => {
    if (args.length === 0) {
      return mockCurrentDate;
    }
    return new originalDate(...args);
  }) as any;
  global.Date.UTC = originalDate.UTC;
  global.Date.parse = originalDate.parse;
  global.Date.now = Date.now;
});

afterEach(() => {
  Date.now = originalNow;
  global.Date = originalDate;
});

const originalDate = Date;

describe('formatDate', () => {
  it('should return "Now" for today', () => {
    const today = '2023-12-15T10:00:00.000Z';
    expect(formatDate(today)).toBe('Now');
  });

  it('should return "Tomorrow" for tomorrow', () => {
    const tomorrow = '2023-12-16T10:00:00.000Z';
    expect(formatDate(tomorrow)).toBe('Tomorrow');
  });

  it('should return "Yesterday" for yesterday', () => {
    const yesterday = '2023-12-14T10:00:00.000Z';
    expect(formatDate(yesterday)).toBe('Yesterday');
  });

  it('should return "In X days" for future dates', () => {
    const future = '2023-12-18T10:00:00.000Z';
    expect(formatDate(future)).toBe('In 3 days');
  });

  it('should return "X days ago" for past dates', () => {
    const past = '2023-12-12T10:00:00.000Z';
    expect(formatDate(past)).toBe('3 days ago');
  });
});

describe('formatMemoryDate', () => {
  it('should return "Today" for today', () => {
    const today = '2023-12-15T10:00:00.000Z';
    expect(formatMemoryDate(today)).toBe('Today');
  });

  it('should return "X days ago" for recent past dates', () => {
    const threeDaysAgo = '2023-12-12T10:00:00.000Z';
    expect(formatMemoryDate(threeDaysAgo)).toBe('3 days ago');
  });

  it('should return "1 day ago" for yesterday (singular)', () => {
    const yesterday = '2023-12-14T10:00:00.000Z';
    expect(formatMemoryDate(yesterday)).toBe('1 day ago');
  });

  it('should return "1 year ago" for one year ago (singular)', () => {
    const oneYearAgo = '2022-12-15T10:00:00.000Z';
    expect(formatMemoryDate(oneYearAgo)).toBe('1 year ago');
  });

  it('should return "X years ago" for multiple years ago (plural)', () => {
    const twoYearsAgo = '2021-12-15T10:00:00.000Z';
    expect(formatMemoryDate(twoYearsAgo)).toBe('2 years ago');
  });
});