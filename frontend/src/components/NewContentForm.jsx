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
  const [file, setFile] = useState(null);
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
        file,
      });
      setTitle('');
      setFileUrl('');
      setFile(null);
      // El campo de archivo no se puede vaciar cambiando su valor; hay que
      // reiniciar el formulario del navegador.
      event.target.reset();
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

        <div className="form-field">
          <label className="form-field__label" htmlFor="archivo-material">
            Archivo de la clase
          </label>
          <p className="form-field__help" id="ayuda-archivo">
            Opcional. Audio, video o documento, hasta 200 MB. Si sube un audio o
            un video, después podrá generar su transcripción desde aquí mismo.
          </p>
          <input
            id="archivo-material"
            className="form-field__input"
            type="file"
            accept="audio/*,video/*,.pdf,.doc,.docx,.odt,.txt"
            onChange={(evento) => setFile(evento.target.files[0] || null)}
            disabled={submitting}
            aria-describedby="ayuda-archivo"
          />
        </div>

        <FormField
          id="url-material"
          label="O un enlace, si el material ya está en otro sitio"
          type="url"
          value={fileUrl}
          onChange={setFileUrl}
          help="Se ignora si sube un archivo."
          disabled={submitting || Boolean(file)}
        />

        <button className="boton-principal" type="submit" disabled={submitting}>
          {submitting ? (file ? 'Subiendo el archivo…' : 'Guardando…') : 'Agregar material'}
        </button>
      </form>
    </section>
  );
}
