import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import Home from '../renderer/Home';

// Mock the DailyQuote and Main components to simplify testing
jest.mock('../renderer/DailyQuote', () => {
  return function MockDailyQuote() {
    return <div data-testid="daily-quote">Daily Quote Component</div>;
  };
});

jest.mock('../renderer/Main', () => {
  return function MockMain() {
    return <div data-testid="main">Main Component</div>;
  };
});

describe('Home Component', () => {
  // Store original environment
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env for each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it('should show DailyQuote by default when NT_SKIP_DAILY_QUOTE is not set', () => {
    delete process.env.NT_SKIP_DAILY_QUOTE;

    render(<Home />);

    expect(screen.getByTestId('daily-quote')).toBeInTheDocument();
    expect(screen.queryByTestId('main')).not.toBeInTheDocument();
  });

  it('should show DailyQuote when NT_SKIP_DAILY_QUOTE is set to false', () => {
    process.env.NT_SKIP_DAILY_QUOTE = 'false';

    render(<Home />);

    expect(screen.getByTestId('daily-quote')).toBeInTheDocument();
    expect(screen.queryByTestId('main')).not.toBeInTheDocument();
  });

  it('should skip DailyQuote and show Main when NT_SKIP_DAILY_QUOTE is set to true', () => {
    process.env.NT_SKIP_DAILY_QUOTE = 'true';

    render(<Home />);

    expect(screen.queryByTestId('daily-quote')).not.toBeInTheDocument();
    expect(screen.getByTestId('main')).toBeInTheDocument();
  });

  it('should show DailyQuote when NT_SKIP_DAILY_QUOTE is set to any other value', () => {
    process.env.NT_SKIP_DAILY_QUOTE = 'other';

    render(<Home />);

    expect(screen.getByTestId('daily-quote')).toBeInTheDocument();
    expect(screen.queryByTestId('main')).not.toBeInTheDocument();
  });
});
