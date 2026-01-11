import { describe, it, expect, vi } from 'vitest';
import { getHelloWorld, printHelloWorld } from '../src/hello-world';

describe('Hello World Module', () => {
  describe('getHelloWorld', () => {
    it('should return "hello world" string', () => {
      const result = getHelloWorld();
      expect(result).toBe('hello world');
      expect(typeof result).toBe('string');
    });
  });

  describe('printHelloWorld', () => {
    it('should log "hello world" to console', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      printHelloWorld();
      
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('hello world');
      
      consoleSpy.mockRestore();
    });
  });
});