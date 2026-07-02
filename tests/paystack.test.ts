import { describe, it, expect } from 'vitest';
import { isValidEmail, isValidAmount, toSubunit } from '../src/lib/paystack';

describe('paystack helpers', () => {
  describe('toSubunit', () => {
    it('multiplies major units to integer subunits', () => {
      expect(toSubunit(500)).toBe(50000);
      expect(toSubunit('1000')).toBe(100000);
    });

    it('rounds fractional amounts to whole subunits', () => {
      expect(toSubunit(9.99)).toBe(999);
      expect(toSubunit('2.5')).toBe(250);
    });

    it('returns 0 for invalid / non-positive input', () => {
      expect(toSubunit(0)).toBe(0);
      expect(toSubunit(-5)).toBe(0);
      expect(toSubunit('abc')).toBe(0);
      expect(toSubunit('')).toBe(0);
    });
  });

  describe('isValidAmount', () => {
    it('accepts positive amounts and rejects the rest', () => {
      expect(isValidAmount(100)).toBe(true);
      expect(isValidAmount('0.5')).toBe(true);
      expect(isValidAmount(0)).toBe(false);
      expect(isValidAmount('')).toBe(false);
      expect(isValidAmount('nope')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('accepts well-formed addresses', () => {
      expect(isValidEmail('fan@example.com')).toBe(true);
      expect(isValidEmail('  a.b@c.co  ')).toBe(true);
    });

    it('rejects malformed addresses', () => {
      expect(isValidEmail('nope')).toBe(false);
      expect(isValidEmail('a@b')).toBe(false);
      expect(isValidEmail('a @b.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });
});
