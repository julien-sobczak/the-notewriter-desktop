import { toHumanReadableDate } from '../renderer/dateUtils';

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

describe('toHumanReadableDate', () => {
  it('should return "Today" for today', () => {
    const today = '2023-12-15T10:00:00.000Z';
    expect(toHumanReadableDate(today)).toBe('Today');
  });

  it('should return "Tomorrow" for tomorrow', () => {
    const tomorrow = '2023-12-16T10:00:00.000Z';
    expect(toHumanReadableDate(tomorrow)).toBe('Tomorrow');
  });

  it('should return "Yesterday" for yesterday', () => {
    const yesterday = '2023-12-14T10:00:00.000Z';
    expect(toHumanReadableDate(yesterday)).toBe('Yesterday');
  });

  it('should return "in X days" for future dates within a week', () => {
    const future = '2023-12-18T10:00:00.000Z';
    expect(toHumanReadableDate(future)).toBe('in 3 days');
  });

  it('should return "in a week" for future dates 7 days away', () => {
    const future = '2023-12-22T10:00:00.000Z';
    expect(toHumanReadableDate(future)).toBe('in a week');
  });

  it('should return "in a month" for future dates about a month away', () => {
    const future = '2024-01-15T10:00:00.000Z';
    expect(toHumanReadableDate(future)).toBe('in a month');
  });

  it('should return "X days ago" for past dates within a week', () => {
    const past = '2023-12-12T10:00:00.000Z';
    expect(toHumanReadableDate(past)).toBe('3 days ago');
  });

  it('should return "1 week ago" for past dates one week ago', () => {
    const past = '2023-12-08T10:00:00.000Z';
    expect(toHumanReadableDate(past)).toBe('1 week ago');
  });

  it('should return "1 month ago" for past dates about a month ago', () => {
    const past = '2023-11-15T10:00:00.000Z';
    expect(toHumanReadableDate(past)).toBe('1 month ago');
  });

  it('should return "1 year ago" for past dates about a year ago', () => {
    const past = '2022-12-15T10:00:00.000Z';
    expect(toHumanReadableDate(past)).toBe('1 year ago');
  });

  it('should return "2 years ago" for past dates multiple years ago', () => {
    const past = '2021-12-15T10:00:00.000Z';
    expect(toHumanReadableDate(past)).toBe('2 years ago');
  });
});
