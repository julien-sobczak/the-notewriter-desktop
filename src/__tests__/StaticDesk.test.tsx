import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import StaticDesk from '../renderer/StaticDesk';

describe('StaticDesk', () => {
  it('should render', () => {
    expect(render(<StaticDesk />)).toBeTruthy();
  });
});
