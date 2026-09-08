// Campo de formulario accesible.
//
// Reune etiqueta, ayuda y error, y los enlaza con aria-describedby. Se extrae a
// un componente para que ninguna pantalla pueda olvidarse de alguna de esas
// piezas: una etiqueta suelta o un error sin asociar deja el campo inservible
// para un lector de pantalla.
import Icon from './Icon';
import './FormField.css';

export default function FormField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  help,
  autoComplete,
  required = false,
  disabled = false,
  inputRef,
}) {
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;
  const describedBy = [help ? helpId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className="form-field">
      {/* La etiqueta es un elemento propio, no un placeholder: el placeholder
          desaparece al escribir y no lo anuncian todos los lectores. */}
      <label className="form-field__label" htmlFor={id}>
        {label}
        {required && (
          <span className="form-field__required" aria-hidden="true"> *</span>
        )}
        {required && <span className="sr-only"> (obligatorio)</span>}
      </label>

      {help && (
        <p className="form-field__help" id={helpId}>{help}</p>
      )}

      <input
        className={`form-field__input${error ? ' form-field__input--error' : ''}`}
        id={id}
        ref={inputRef}
        type={type}
        value={value}
        onChange={(evento) => onChange(evento.target.value)}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy || undefined}
      />

      {/* El error se anuncia al aparecer, sin que el usuario tenga que ir a
          buscarlo, y se marca con texto ademas de color. */}
      {error && (
        <p className="form-field__error" id={errorId}>
          <Icon nombre="alerta" tamano={18} />
          {error}
        </p>
      )}
    </div>
  );
}
