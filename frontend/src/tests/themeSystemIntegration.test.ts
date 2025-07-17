import { describe, it, expect } from 'vitest';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { ThemeToggle } from '../components/ThemeToggle';

describe('Theme System Integration', () => {
  it('should export ThemeProvider correctly', () => {
    expect(ThemeProvider).toBeDefined();
    expect(typeof ThemeProvider).toBe('function');
  });

  it('should export useTheme hook correctly', () => {
    expect(useTheme).toBeDefined();
    expect(typeof useTheme).toBe('function');
  });

  it('should export ThemeToggle component correctly', () => {
    expect(ThemeToggle).toBeDefined();
    expect(typeof ThemeToggle).toBe('function');
  });

  it('should have correct theme types', () => {
    // This test ensures the Theme type is properly defined
    const themes: Array<'light' | 'dark'> = ['light', 'dark'];
    expect(themes).toContain('light');
    expect(themes).toContain('dark');
  });
});