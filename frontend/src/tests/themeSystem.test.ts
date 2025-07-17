import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { ThemeToggle } from '../components/ThemeToggle';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Test component that uses the theme context
const TestComponent: React.FC = () => {
  const { theme, toggleTheme, setTheme } = useTheme();
  return React.createElement('div', null,
    React.createElement('span', { 'data-testid': 'current-theme' }, theme),
    React.createElement('button', { 'data-testid': 'toggle-theme', onClick: toggleTheme }, 'Toggle Theme'),
    React.createElement('button', { 'data-testid': 'set-light', onClick: () => setTheme('light') }, 'Set Light'),
    React.createElement('button', { 'data-testid': 'set-dark', onClick: () => setTheme('dark') }, 'Set Dark')
  );
};

describe('Theme System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset document attributes
    document.documentElement.removeAttribute('data-theme');
  });

  describe('ThemeProvider', () => {
    it('should initialize with dark theme by default', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      render(
        React.createElement(ThemeProvider, null,
          React.createElement(TestComponent)
        )
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    });

    it('should initialize with saved theme from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('light');
      
      render(
        React.createElement(ThemeProvider, null,
          React.createElement(TestComponent)
        )
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
    });

    it('should toggle theme correctly', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      render(
        React.createElement(ThemeProvider, null,
          React.createElement(TestComponent)
        )
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      
      fireEvent.click(screen.getByTestId('toggle-theme'));
      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      
      fireEvent.click(screen.getByTestId('toggle-theme'));
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    });

    it('should set theme directly', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      render(
        React.createElement(ThemeProvider, null,
          React.createElement(TestComponent)
        )
      );

      fireEvent.click(screen.getByTestId('set-light'));
      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      
      fireEvent.click(screen.getByTestId('set-dark'));
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    });

    it('should save theme to localStorage', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      render(
        React.createElement(ThemeProvider, null,
          React.createElement(TestComponent)
        )
      );

      fireEvent.click(screen.getByTestId('toggle-theme'));
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light');
    });

    it('should apply theme attribute to document root', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      render(
        React.createElement(ThemeProvider, null,
          React.createElement(TestComponent)
        )
      );

      // Dark theme should not set data-theme attribute
      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
      
      fireEvent.click(screen.getByTestId('toggle-theme'));
      
      // Light theme should set data-theme attribute
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });
  });

  describe('ThemeToggle', () => {
    it('should render with correct icon for dark theme', () => {
      localStorageMock.getItem.mockReturnValue('dark');
      
      render(
        React.createElement(ThemeProvider, null,
          React.createElement(ThemeToggle)
        )
      );

      expect(screen.getByText('☀️')).toBeInTheDocument();
    });

    it('should render with correct icon for light theme', () => {
      localStorageMock.getItem.mockReturnValue('light');
      
      render(
        React.createElement(ThemeProvider, null,
          React.createElement(ThemeToggle)
        )
      );

      expect(screen.getByText('🌙')).toBeInTheDocument();
    });

    it('should toggle theme when clicked', () => {
      localStorageMock.getItem.mockReturnValue('dark');
      
      render(
        React.createElement(ThemeProvider, null,
          React.createElement('div', null,
            React.createElement(ThemeToggle),
            React.createElement(TestComponent)
          )
        )
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      
      fireEvent.click(screen.getByRole('button', { name: /switch to light theme/i }));
      
      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
    });

    it('should have correct accessibility attributes', () => {
      localStorageMock.getItem.mockReturnValue('dark');
      
      render(
        React.createElement(ThemeProvider, null,
          React.createElement(ThemeToggle)
        )
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Switch to light theme');
      expect(button).toHaveAttribute('title', 'Switch to light theme');
    });
  });

  describe('useTheme hook', () => {
    it('should throw error when used outside ThemeProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(React.createElement(TestComponent));
      }).toThrow('useTheme must be used within a ThemeProvider');
      
      consoleSpy.mockRestore();
    });
  });
});