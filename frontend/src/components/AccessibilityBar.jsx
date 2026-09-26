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
      {/* Se usa un fieldset con radios reales, no botones con role="radio".
          Los radios nativos traen el comportamiento esperado: el grupo entero
          es una sola parada del tabulador y se recorre con las flechas. Con
          botones sueltos, quien navega con teclado tendria que tabular una vez
          por cada opcion antes de seguir. */}
      <fieldset className="accessibility-bar__grupo">
        <legend className="accessibility-bar__label">Tamaño de letra</legend>
        {TEXT_SCALES.map((option) => (
          <label key={option.id} className="accessibility-bar__opcion">
            <input
              type="radio"
              name="escala-texto"
              value={option.id}
              checked={scale === option.id}
              onChange={() => setScale(option.id)}
            />
            <span className="accessibility-bar__texto-opcion">{option.label}</span>
          </label>
        ))}
      </fieldset>

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
