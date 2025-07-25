import { Interval } from './srs';

describe('Interval', () => {
  describe('parse', () => {
    it('parses minutes', () => {
      const i = Interval.parse('10m');
      expect(i.value).toBe(10);
      expect(i.unit).toBe('m');
    });

    it('parses hours', () => {
      const i = Interval.parse('2h');
      expect(i.value).toBe(2);
      expect(i.unit).toBe('h');
    });

    it('parses days', () => {
      const i = Interval.parse('3d');
      expect(i.value).toBe(3);
      expect(i.unit).toBe('d');
    });

    it('throws on invalid string', () => {
      expect(() => Interval.parse('bad')).toThrow();
      expect(() => Interval.parse('10x')).toThrow();
      expect(() => Interval.parse('')).toThrow();
    });
  });

  describe('toMinutes', () => {
    it('converts minutes', () => {
      expect(Interval.parse('10m').toMinutes()).toBe(10);
    });
    it('converts hours', () => {
      expect(Interval.parse('2h').toMinutes()).toBe(120);
    });
    it('converts days', () => {
      expect(Interval.parse('1d').toMinutes()).toBe(1440);
    });
  });

  describe('fromMinutes', () => {
    it('returns days for >= 1440', () => {
      const i = Interval.fromMinutes(2880);
      expect(i.value).toBe(2);
      expect(i.unit).toBe('d');
    });
    it('returns hours for >= 60 and < 1440', () => {
      const i = Interval.fromMinutes(180);
      expect(i.value).toBe(3);
      expect(i.unit).toBe('h');
    });
    it('returns minutes for < 60', () => {
      const i = Interval.fromMinutes(45);
      expect(i.value).toBe(45);
      expect(i.unit).toBe('m');
    });
  });

  describe('multiply', () => {
    it('multiplies and rounds up to hour if >= 60', () => {
      const i = Interval.parse('45m').multiply(2);
      expect(i.value).toBe(1);
      expect(i.unit).toBe('h');
    });
    it('multiplies and rounds up to day if >= 1440', () => {
      const i = Interval.parse('2h').multiply(13);
      expect(i.value).toBe(1);
      expect(i.unit).toBe('d');
    });
    it('multiplies and stays in minutes if < 60', () => {
      const i = Interval.parse('10m').multiply(2);
      expect(i.value).toBe(20);
      expect(i.unit).toBe('m');
    });
  });

  describe('toString', () => {
    it('returns string representation', () => {
      expect(new Interval(10, 'm').toString()).toBe('10m');
      expect(new Interval(2, 'h').toString()).toBe('2h');
      expect(new Interval(1, 'd').toString()).toBe('1d');
    });
  });
});
