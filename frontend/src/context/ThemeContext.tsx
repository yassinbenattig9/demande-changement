import React, { createContext, useContext } from 'react';

type Theme = 'light';

/**
 * Thème "light only" : décision produit de s'engager sur un mode clair exclusif.
 * Le Provider ne bascule aucune classe CSS (le dark mode est définitivement retiré).
 * Conservé pour la compatibilité de l'API (useTheme) avec l'existant.
 */
const ThemeContext = createContext<{ theme: Theme }>({ theme: 'light' });

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <ThemeContext.Provider value={{ theme: 'light' }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme doit être utilisé au sein de ThemeProvider');
  return ctx;
};