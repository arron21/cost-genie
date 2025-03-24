/**
 * Theme utility functions for toggling dark/light mode
 */

type Theme = 'light' | 'dark' | 'system';

/**
 * Set the application theme
 * @param theme 'light', 'dark', or 'system'
 */
export const setTheme = (theme: Theme): void => {
  // Save theme preference to localStorage
  localStorage.setItem('theme', theme);
  
  // Apply the theme
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  } else if (theme === 'light') {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
  } else {
    // System preference
    document.documentElement.classList.remove('light');
    document.documentElement.classList.remove('dark');
    
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.add('light');
    }
  }
};

/**
 * Get the current theme
 * @returns The current theme
 */
export const getTheme = (): Theme => {
  const savedTheme = localStorage.getItem('theme') as Theme | null;
  return savedTheme || 'system';
};

/**
 * Initialize theme based on saved preference or system preference
 */
export const initTheme = (): void => {
  const theme = getTheme();
  setTheme(theme);
  
  // Listen for system preference changes
  if (theme === 'system' && window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (getTheme() === 'system') {
        if (e.matches) {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        } else {
          document.documentElement.classList.add('light');
          document.documentElement.classList.remove('dark');
        }
      }
    });
  }
};
