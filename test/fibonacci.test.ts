import { describe, it, expect } from 'vitest';
import {
  fibonacci,
  fibonacciRecursive,
  fibonacciIterative,
  fibonacciMemoized,
} from '../src/fibonacci';

describe('Fibonacci Functions', () => {
  describe('fibonacciRecursive', () => {
    it('should return 0 for n = 0', () => {
      expect(fibonacciRecursive(0)).toBe(0);
    });

    it('should return 1 for n = 1', () => {
      expect(fibonacciRecursive(1)).toBe(1);
    });

    it('should return 1 for n = 2', () => {
      expect(fibonacciRecursive(2)).toBe(1);
    });

    it('should return 2 for n = 3', () => {
      expect(fibonacciRecursive(3)).toBe(2);
    });

    it('should return 3 for n = 4', () => {
      expect(fibonacciRecursive(4)).toBe(3);
    });

    it('should return 5 for n = 5', () => {
      expect(fibonacciRecursive(5)).toBe(5);
    });

    it('should return 8 for n = 6', () => {
      expect(fibonacciRecursive(6)).toBe(8);
    });

    it('should throw error for negative n', () => {
      expect(() => fibonacciRecursive(-1)).toThrow('n must be a non-negative integer');
    });
  });

  describe('fibonacciIterative', () => {
    it('should return 0 for n = 0', () => {
      expect(fibonacciIterative(0)).toBe(0);
    });

    it('should return 1 for n = 1', () => {
      expect(fibonacciIterative(1)).toBe(1);
    });

    it('should return 1 for n = 2', () => {
      expect(fibonacciIterative(2)).toBe(1);
    });

    it('should return 2 for n = 3', () => {
      expect(fibonacciIterative(3)).toBe(2);
    });

    it('should return 3 for n = 4', () => {
      expect(fibonacciIterative(4)).toBe(3);
    });

    it('should return 5 for n = 5', () => {
      expect(fibonacciIterative(5)).toBe(5);
    });

    it('should return 8 for n = 6', () => {
      expect(fibonacciIterative(6)).toBe(8);
    });

    it('should handle larger numbers efficiently', () => {
      expect(fibonacciIterative(10)).toBe(55);
      expect(fibonacciIterative(20)).toBe(6765);
    });

    it('should throw error for negative n', () => {
      expect(() => fibonacciIterative(-1)).toThrow('n must be a non-negative integer');
    });
  });

  describe('fibonacciMemoized', () => {
    it('should return 0 for n = 0', () => {
      expect(fibonacciMemoized(0)).toBe(0);
    });

    it('should return 1 for n = 1', () => {
      expect(fibonacciMemoized(1)).toBe(1);
    });

    it('should return 1 for n = 2', () => {
      expect(fibonacciMemoized(2)).toBe(1);
    });

    it('should return 2 for n = 3', () => {
      expect(fibonacciMemoized(3)).toBe(2);
    });

    it('should return 3 for n = 4', () => {
      expect(fibonacciMemoized(4)).toBe(3);
    });

    it('should return 5 for n = 5', () => {
      expect(fibonacciMemoized(5)).toBe(5);
    });

    it('should return 8 for n = 6', () => {
      expect(fibonacciMemoized(6)).toBe(8);
    });

    it('should handle larger numbers efficiently', () => {
      expect(fibonacciMemoized(10)).toBe(55);
      expect(fibonacciMemoized(20)).toBe(6765);
    });

    it('should throw error for negative n', () => {
      expect(() => fibonacciMemoized(-1)).toThrow('n must be a non-negative integer');
    });
  });

  describe('fibonacci (default)', () => {
    it('should return the same results as fibonacciIterative', () => {
      expect(fibonacci(0)).toBe(fibonacciIterative(0));
      expect(fibonacci(1)).toBe(fibonacciIterative(1));
      expect(fibonacci(5)).toBe(fibonacciIterative(5));
      expect(fibonacci(10)).toBe(fibonacciIterative(10));
    });

    it('should compute correct values', () => {
      const testCases = [
        { n: 0, expected: 0 },
        { n: 1, expected: 1 },
        { n: 2, expected: 1 },
        { n: 3, expected: 2 },
        { n: 4, expected: 3 },
        { n: 5, expected: 5 },
        { n: 6, expected: 8 },
        { n: 7, expected: 13 },
        { n: 8, expected: 21 },
        { n: 9, expected: 34 },
        { n: 10, expected: 55 },
      ];

      testCases.forEach(({ n, expected }) => {
        expect(fibonacci(n)).toBe(expected);
      });
    });
  });

  describe('Consistency between implementations', () => {
    it('should return same results for all implementations', () => {
      for (let n = 0; n <= 10; n++) {
        const recursive = fibonacciRecursive(n);
        const iterative = fibonacciIterative(n);
        const memoized = fibonacciMemoized(n);
        const defaultFn = fibonacci(n);

        expect(recursive).toBe(iterative);
        expect(iterative).toBe(memoized);
        expect(memoized).toBe(defaultFn);
      }
    });
  });
});