// Preferencias de accesibilidad del usuario.
//
// El contraste y el tamano de letra se aplican como atributos y variables en
// <html>, de modo que afectan a toda la interfaz sin que cada componente tenga
// que enterarse. Se guardan para que el usuario no las reajuste en cada visita.
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'plataforma.preferencias';

// Tres pasos bastan: la letra normal, una intermedia y una grande. Mas opciones
// complican la eleccion sin aportar.
export const TEXT_SCALES = [
  { id: 'normal', label: 'Normal', value: 1 },
  { id: 'grande', label: 'Grande', value: 1.25 },
  { id: 'mayor', label: 'Muy grande', value: 1.5 },
];

const DEFAULTS = { contrast: 'normal', scale: 'normal' };

const PreferencesContext = createContext(null);

function readStored() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const data = JSON.parse(raw);
    return {
      contrast: data.contrast === 'alto' ? 'alto' : 'normal',
      scale: TEXT_SCALES.some((s) => s.id === data.scale) ? data.scale : 'normal',
    };
  } catch {
    // Modo privado o almacenamiento bloqueado: se usan los valores por defecto.
    return DEFAULTS;
  }
}

export function PreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(readStored);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-contraste', preferences.contrast);

    const scale = TEXT_SCALES.find((s) => s.id === preferences.scale) || TEXT_SCALES[0];
    root.style.setProperty('--escala-texto', String(scale.value));

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Sin almacenamiento, las preferencias duran lo que la visita.
    }
  }, [preferences]);

  const value = useMemo(() => ({
    ...preferences,
    toggleContrast: () =>
      setPreferences((p) => ({ ...p, contrast: p.contrast === 'alto' ? 'normal' : 'alto' })),
    setScale: (scale) => setPreferences((p) => ({ ...p, scale })),
  }), [preferences]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences debe usarse dentro de PreferencesProvider');
  }
  return context;
}
