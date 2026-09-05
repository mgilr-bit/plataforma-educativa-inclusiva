// Alta de material en un curso.
import { useRef, useState } from 'react';
import { api } from '../api/client';
import FormField from './FormField';

const TIPOS = [
  { valor: 'video', etiqueta: 'Video' },
  { valor: 'audio', etiqueta: 'Audio' },
  { valor: 'documento', etiqueta: 'Documento' },
  { valor: 'texto', etiqueta: 'Texto' },
];

export default function NewContentForm({ courseId, onCreated }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('video');
  const [fileUrl, setFileUrl] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const errorRef = useRef(null);
  const titleRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);

    if (!title.trim()) {
      setFieldErrors({ title: 'Escriba un título para el material.' });
      titleRef.current?.focus();
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      const data = await api.createContent({
        courseId: Number(courseId),
        title: title.trim(),
        type,
        fileUrl: fileUrl.trim(),
      });
      setTitle('');
      setFileUrl('');
      // Se confirma con el nombre de lo creado: un "listo" seco no deja claro
      // que se guardo.
      setSuccess(`Se agregó "${data.contenido.titulo}" al curso.`);
      onCreated?.(data.contenido);
    } catch (error) {
      setFormError(error.message);
      window.requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="titulo-nuevo-material">
      <h2 id="titulo-nuevo-material">Agregar material</h2>

      {formError && (
        <div className="alerta-error" role="alert" tabIndex={-1} ref={errorRef}>
          {formError}
        </div>
      )}

      {/* status, no alert: es una confirmacion, no una interrupcion. */}
      {success && (
        <p role="status" className="mensaje-exito">{success}</p>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          id="titulo-material"
          label="Título del material"
          value={title}
          onChange={setTitle}
          error={fieldErrors.title}
          required
          disabled={submitting}
          inputRef={titleRef}
        />

        <div className="form-field">
          <label className="form-field__label" htmlFor="tipo-material">
            Tipo de material
          </label>
          <select
            id="tipo-material"
            className="form-field__input"
            value={type}
            onChange={(evento) => setType(evento.target.value)}
            disabled={submitting}
          >
            {TIPOS.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
            ))}
          </select>
        </div>

        <FormField
          id="url-material"
          label="Enlace del archivo"
          type="url"
          value={fileUrl}
          onChange={setFileUrl}
          help="Opcional. Puede agregarlo después."
          disabled={submitting}
        />

        <button className="boton-principal" type="submit" disabled={submitting}>
          {submitting ? 'Guardando…' : 'Agregar material'}
        </button>
      </form>
    </section>
  );
}
