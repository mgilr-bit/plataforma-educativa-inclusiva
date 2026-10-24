// Ajustes de un material: corregir sus datos o retirarlo.
//
// Un material subido por equivocacion, con el titulo mal o en el curso que no
// era, no deberia obligar a crear otro y dejar el anterior rondando. Tres
// materiales casi homonimos en un curso confunden mas que la falta de uno.
import { useState } from 'react';
import { api } from '../api/client';
import './ContentSettings.css';

const TIPOS = [
  { valor: 'video', etiqueta: 'Video' },
  { valor: 'audio', etiqueta: 'Audio' },
  { valor: 'documento', etiqueta: 'Documento' },
  { valor: 'texto', etiqueta: 'Texto' },
];

export default function ContentSettings({ content, tieneTranscripcion, onUpdated }) {
  const [titulo, setTitulo] = useState(content.titulo);
  const [tipo, setTipo] = useState(content.tipo);
  const [archivo, setArchivo] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState('');

  const retirado = content.estado === false;

  async function guardar(evento) {
    evento.preventDefault();
    if (!titulo.trim()) {
      setError('El material necesita un título.');
      return;
    }

    setError(null);
    setGuardando(true);
    try {
      await api.updateContent(content.id_contenido, {
        title: titulo.trim(),
        type: tipo,
        file: archivo || undefined,
      });
      setArchivo(null);
      setAviso('Se guardaron los cambios.');
      onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarPublicacion() {
    setError(null);
    setGuardando(true);
    try {
      if (retirado) {
        await api.updateContent(content.id_contenido, { state: true });
        setAviso('El material volvió a publicarse. Los estudiantes ya pueden verlo.');
      } else {
        await api.deactivateContent(content.id_contenido);
        setAviso('El material quedó retirado. Los estudiantes ya no lo ven.');
      }
      setConfirmando(false);
      onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="ajustes" aria-labelledby="titulo-ajustes">
      <h2 id="titulo-ajustes">Ajustes del material</h2>

      {error && <p className="ajustes__error" role="alert">{error}</p>}
      <p className="ajustes__estado-vivo" aria-live="polite">{aviso}</p>

      <form onSubmit={guardar}>
        <div className="form-field">
          <label className="form-field__label" htmlFor="ajuste-titulo">Título</label>
          <input
            id="ajuste-titulo"
            className="form-field__input"
            type="text"
            value={titulo}
            onChange={(evento) => setTitulo(evento.target.value)}
            disabled={guardando}
          />
        </div>

        <div className="form-field">
          <label className="form-field__label" htmlFor="ajuste-tipo">Tipo</label>
          <select
            id="ajuste-tipo"
            className="form-field__input"
            value={tipo}
            onChange={(evento) => setTipo(evento.target.value)}
            disabled={guardando}
          >
            {TIPOS.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
            ))}
          </select>
        </div>

        {/* Cambiar el audio cuando ya hay transcripcion dejaria el texto
            hablando de algo que ya no suena, y el estudiante sordo no tiene
            como notarlo. Se explica en vez de ofrecerlo y fallar despues. */}
        {tieneTranscripcion ? (
          <p className="ajustes__nota">
            El archivo ya no se puede cambiar, porque este material ya tiene
            transcripción. Los subtítulos hablarían de un audio distinto. Si se
            equivocó de clase, retire este material y suba la correcta.
          </p>
        ) : (
          <div className="form-field">
            <label className="form-field__label" htmlFor="ajuste-archivo">
              Cambiar el archivo
            </label>
            <p className="form-field__help" id="ayuda-ajuste-archivo">
              Opcional. Si elige uno nuevo, el anterior se borra.
            </p>
            <input
              id="ajuste-archivo"
              className="form-field__input"
              type="file"
              accept="audio/*,video/*,.pdf,.doc,.docx,.odt,.txt"
              onChange={(evento) => setArchivo(evento.target.files[0] || null)}
              disabled={guardando}
              aria-describedby="ayuda-ajuste-archivo"
            />
          </div>
        )}

        <button type="submit" className="boton-principal" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>

      <div className="ajustes__retiro">
        <h3>{retirado ? 'Material retirado' : 'Retirar el material'}</h3>
        <p className="ajustes__nota">
          {retirado
            ? 'Los estudiantes no lo ven. Puede volver a publicarlo cuando quiera.'
            : 'Los estudiantes dejarán de verlo. No se pierde nada: la transcripción y lo que ya estudiaron se conservan, y puede volver a publicarlo.'}
        </p>

        {retirado || !confirmando ? (
          <button
            type="button"
            className="ajustes__accion"
            onClick={() => (retirado ? cambiarPublicacion() : setConfirmando(true))}
            disabled={guardando}
          >
            {retirado ? 'Volver a publicar' : 'Retirar el material'}
          </button>
        ) : (
          // Se pregunta dentro de la pagina y no con una ventana del navegador:
          // el aviso del navegador no se puede redactar en lenguaje sencillo
          // ni se lleva bien con los lectores de pantalla.
          <div className="ajustes__confirmar" role="group" aria-label="Confirmar el retiro">
            <p>¿Retirar «{content.titulo}»?</p>
            <button
              type="button"
              className="ajustes__accion"
              onClick={cambiarPublicacion}
              disabled={guardando}
            >
              Sí, retirarlo
            </button>
            <button
              type="button"
              className="ajustes__accion"
              onClick={() => setConfirmando(false)}
              disabled={guardando}
            >
              No, dejarlo
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
