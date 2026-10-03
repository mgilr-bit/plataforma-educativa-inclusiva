// Boton para generar la transcripcion de un material.
//
// Sin esto el recorrido se parte en dos: el docente sube la clase y ahi se
// queda. Sin transcripcion no hay texto, no hay subtitulos y el asistente no
// tiene de que agarrarse, de modo que para un estudiante sordo ese material
// no sirve de nada.
import { useRef, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { puedeGenerar } from '../utils/transcripcion';
import './GenerateTranscription.css';

export default function GenerateTranscription({ content, onGenerated }) {
  const { user } = useAuth();
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState(null);
  const errorRef = useRef(null);

  if (!puedeGenerar(user, content)) {
    return null;
  }

  async function generar() {
    setError(null);
    setGenerando(true);
    try {
      await api.transcribe(content.id_contenido);
      // Quien recarga es la pantalla: es la que sabe pedir la transcripcion
      // junto con sus subtitulos y llevar el foco hasta ella.
      onGenerated();
    } catch (err) {
      setError(err.message);
      window.requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="generar">
      <h3 className="generar__titulo">Este material todavía no tiene transcripción</h3>
      <p className="generar__ayuda" id="ayuda-generar">
        La plataforma escucha el audio y escribe el texto. Tarda más o menos un
        minuto por cada diez minutos de clase. Puede dejar la página abierta
        mientras tanto.
      </p>

      <button
        type="button"
        className="boton-principal"
        onClick={generar}
        disabled={generando}
        aria-describedby="ayuda-generar"
      >
        {generando ? 'Generando la transcripción…' : 'Generar transcripción'}
      </button>

      {/* "polite" y no "assertive": el docente no esta haciendo otra cosa
          mientras espera, y una interrupcion no le adelantaria nada. */}
      <p className="generar__estado" aria-live="polite">
        {generando ? 'Generando la transcripción. Esto puede tardar un momento.' : ''}
      </p>

      {error && (
        <p className="generar__error" role="alert" tabIndex={-1} ref={errorRef}>
          {error}
        </p>
      )}
    </div>
  );
}
