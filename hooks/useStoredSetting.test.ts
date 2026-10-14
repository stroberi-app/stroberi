import { booleanSetting, numberSetting } from './useStoredSetting';

jest.mock('../database', () => ({ database: {} }));

describe('setting codecs', () => {
  it('parses booleans stored as strings, defaulting when unset', () => {
    const codec = booleanSetting(false);
    expect(codec.parse('true')).toBe(true);
    expect(codec.parse('false')).toBe(false);
    expect(codec.parse(null)).toBe(false);
    expect(codec.parse(undefined)).toBe(false);
    expect(booleanSetting(true).parse(null)).toBe(true);
    expect(codec.serialize(true)).toBe('true');
  });

  it('parses numbers, falling back on missing or corrupt values', () => {
    const codec = numberSetting(20);
    expect(codec.parse('35')).toBe(35);
    expect(codec.parse('0')).toBe(0);
    expect(codec.parse(null)).toBe(20);
    expect(codec.parse('abc')).toBe(20);
    expect(codec.serialize(12.5)).toBe('12.5');
  });
});
