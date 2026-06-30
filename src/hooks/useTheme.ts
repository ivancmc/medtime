import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') {
      setTheme(stored);
    } else {
      setTheme('dark');
      localStorage.setItem('theme', 'dark');
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    // 1. Define as cores hexadecimais para cada tema
    // Substitua pelo valor exato que você usa no fundo do seu app em cada modo
    const colorDark = '#000000';
    const colorLight = '#ffffff';

    if (theme === 'dark') {
      root.classList.add('dark');
      // 2. Altera a meta tag para a cor escura
      updateThemeColorMeta(colorDark);
    } else {
      root.classList.remove('dark');
      // 2. Altera a meta tag para a cor clara
      updateThemeColorMeta(colorLight);
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return { theme, toggleTheme };
}

// ─── Função Auxiliar para Manipular a Meta Tag ─────────────────────────
function updateThemeColorMeta(color: string) {
  // Procura se já existe a meta tag no head do HTML
  let meta = document.querySelector('meta[name="theme-color"]');

  if (!meta) {
    // Se por acaso não existir, cria uma nova em tempo de execução
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }

  // Atualiza o atributo content com a nova cor hexadecimal
  meta.setAttribute('content', color);
}