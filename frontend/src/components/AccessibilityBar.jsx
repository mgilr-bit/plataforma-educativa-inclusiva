// Controles de accesibilidad, presentes en toda la aplicacion.
//
// Van arriba y siempre visibles a proposito: si el usuario necesita mas
// contraste o letra mas grande, no puede tener que buscarlo en un menu que
// justamente no alcanza a leer.
import { TEXT_SCALES, usePreferences } from '../context/PreferencesContext';
import './AccessibilityBar.css';

export default function AccessibilityBar() {
  const { contrast, scale, toggleContrast, setScale } = usePreferences();
  const highContrastOn = contrast === 'alto';

  return (
    <div className="accessibility-bar">
      <div className="accessibility-bar__group">
        <span id="text-size-label" className="accessibility-bar__label">
          Tamaño de letra
        </span>
        {/* Un grupo de radio, no botones sueltos: comunica al lector de
            pantalla que son opciones excluyentes y cual esta activa. */}
        <div className="accessibility-bar__options" role="radiogroup" aria-labelledby="text-size-label">
          {TEXT_SCALES.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={scale === option.id}
              className="accessibility-bar__button"
              onClick={() => setScale(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="accessibility-bar__button"
        aria-pressed={highContrastOn}
        onClick={toggleContrast}
      >
        Alto contraste
        <span className="sr-only">{highContrastOn ? ': activado' : ': desactivado'}</span>
      </button>
    </div>
  );
}
