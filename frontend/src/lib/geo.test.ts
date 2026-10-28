import { describe, it, expect } from 'vitest';
import { isInsideBbox, type BBox } from './geo';

describe('isInsideBbox', () => {
  const bbox: BBox = [106.7, -6.3, 106.9, -6.1]; // west, south, east, north

  it('returns true for point inside bbox', () => {
    expect(isInsideBbox(-6.2, 106.8, bbox)).toBe(true);
  });

  it('returns true for point on west edge', () => {
    expect(isInsideBbox(-6.2, 106.7, bbox)).toBe(true);
  });

  it('returns true for point on east edge', () => {
    expect(isInsideBbox(-6.2, 106.9, bbox)).toBe(true);
  });

  it('returns true for point on south edge', () => {
    expect(isInsideBbox(-6.3, 106.8, bbox)).toBe(true);
  });

  it('returns true for point on north edge', () => {
    expect(isInsideBbox(-6.1, 106.8, bbox)).toBe(true);
  });

  it('returns false for point west of bbox', () => {
    expect(isInsideBbox(-6.2, 106.6, bbox)).toBe(false);
  });

  it('returns false for point east of bbox', () => {
    expect(isInsideBbox(-6.2, 107.0, bbox)).toBe(false);
  });

  it('returns false for point south of bbox', () => {
    expect(isInsideBbox(-6.4, 106.8, bbox)).toBe(false);
  });

  it('returns false for point north of bbox', () => {
    expect(isInsideBbox(-6.0, 106.8, bbox)).toBe(false);
  });
});