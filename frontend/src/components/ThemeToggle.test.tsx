import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from './ThemeToggle';
import { ThemeProvider } from '../context/ThemeContext';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';

describe('ThemeToggle', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('toggles light/dark mode and updates localStorage and document body', () => {
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>);
    
    const toggleButton = screen.getByRole('button');
    
    // Assuming default is light mode based on ThemeProvider (usually reads system preference, but let's assume light if no localstorage)
    // If it defaults to light, clicking it makes it dark
    fireEvent.click(toggleButton);
    
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
    
    // Click again to switch to light
    fireEvent.click(toggleButton);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
  });
});
