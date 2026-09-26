// Controles de accesibilidad, presentes en toda la aplicacion.
//
// Van siempre visibles a proposito: si el usuario necesita mas contraste o
// letra mas grande, no puede tener que buscarlo en un menu que justamente no
// alcanza a leer. Para un estudiante sordo el texto es el canal principal, asi
// que estos dos ajustes deciden si el contenido le resulta legible o no.
import { TEXT_SCALES, usePreferences } from '../context/PreferencesContext';
import Icon from './Icon';
import './AccessibilityBar.css';

// Cada opcion se acompana de una "A" del tamano que representa: se entiende de
// un vistazo, sin depender de leer la palabra.
const MUESTRA = { normal: '0.85em', grande: '1em', mayor: '1.15em' };

export default function AccessibilityBar() {
  const { contrast, scale, toggleContrast, setScale } = usePreferences();
  const highContrastOn = contrast === 'alto';

  return (
    <div className="barra-a11y">
      <div className="barra-a11y__interior">
        {/* Radios nativos por debajo del aspecto de control segmentado: el
            grupo entero es una sola parada del tabulador y se recorre con las
            flechas, que es lo que espera quien navega con teclado. Con botones
            sueltos habria que tabular una vez por cada opcion. */}
        <fieldset className="segmentado">
          <legend className="segmentado__titulo">
            <Icon nombre="texto" tamano={16} />
            {/* En pantalla estrecha este texto se oculta a la vista, pero
                sigue siendo el nombre accesible del grupo: quitarlo del todo
                dejaria al lector de pantalla anunciando un grupo sin nombre. */}
            <span className="segmentado__titulo-texto">Tamaño de letra</span>
          </legend>

          <div className="segmentado__opciones">
            {TEXT_SCALES.map((option) => (
              <label key={option.id} className="segmentado__opcion">
                <input
                  type="radio"
                  name="escala-texto"
                  value={option.id}
                  checked={scale === option.id}
                  onChange={() => setScale(option.id)}
                />
                <span aria-hidden="true" className="segmentado__muestra" style={{ fontSize: MUESTRA[option.id] }}>
                  A
                </span>
                <span className="segmentado__etiqueta">{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          className="barra-a11y__contraste"
          aria-pressed={highContrastOn}
          onClick={toggleContrast}
        >
          <Icon nombre="contraste" tamano={16} />
          Alto contraste
          <span className="sr-only">{highContrastOn ? ': activado' : ': desactivado'}</span>
        </button>
      </div>
    </div>
  );
}
