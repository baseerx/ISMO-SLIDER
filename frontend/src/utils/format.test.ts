import { describe, expect, it } from 'vitest';
import { formatDuration } from './format';

describe('formatDuration', () => {
  it('formats seconds and minutes', () => {
    expect(formatDuration(5)).toBe('5s');
    expect(formatDuration(60)).toBe('1m');
    expect(formatDuration(125)).toBe('2m 5s');
  });
});