// Chat con el asistente educativo.
//
// El estudiante pregunta sobre la clase y el asistente responde apoyandose en
// la transcripcion. Las decisiones de accesibilidad aqui pesan mas que en otras
// pantallas: la conversacion cambia sola, y quien no ve la pantalla necesita
// enterarse de que llego una respuesta sin tener que ir a buscarla.
import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import './TutorChat.css';

const LARGO_MINIMO = 3;
const LARGO_MAXIMO = 2000;

export default function TutorChat({ contentId }) {
  const [exchanges, setExchanges] = useState([]);
  const [question, setQuestion] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState(null);
  // Se recupera el foco despues de que el campo vuelva a estar habilitado:
  // un elemento deshabilitado no puede recibirlo.
  const [refocus, setRefocus] = useState(false);

  const errorRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!asking && refocus) {
      inputRef.current?.focus();
      setRefocus(false);
    }
  }, [asking, refocus]);

  useEffect(() => {
    let active = true;
    api.consultations({ contentId })
      .then((data) => {
        // La API devuelve de la mas reciente a la mas antigua; en una
        // conversacion se lee al reves.
        if (active) setExchanges([...data.consultas].reverse());
      })
      .catch(() => {
        // No poder cargar el historial no impide preguntar: se sigue adelante.
        if (active) setExchanges([]);
      })
      .finally(() => { if (active) setLoadingHistory(false); });
    return () => { active = false; };
  }, [contentId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);

    const texto = question.trim();
    if (texto.length < LARGO_MINIMO) {
      setError('Escriba su pregunta antes de enviarla.');
      inputRef.current?.focus();
      return;
    }

    setAsking(true);
    try {
      const data = await api.askTutor({ question: texto, contentId });
      setExchanges((previas) => [...previas, data.consulta]);
      setQuestion('');
      // El foco vuelve al campo: quien usa teclado puede seguir preguntando
      // sin tener que recorrer la conversacion entera hacia atras. Se pide
      // aqui y se aplica cuando el campo deja de estar deshabilitado.
      setRefocus(true);
    } catch (err) {
      setError(
        err.status === 503
          ? 'El asistente no está disponible en este momento. Consulte a su docente.'
          : err.message
      );
      window.requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setAsking(false);
    }
  }

  return (
    <section className="tutor" aria-labelledby="titulo-tutor">
      <h2 id="titulo-tutor">Preguntar al asistente</h2>
      <p className="tutor__ayuda">
        Puede preguntar lo que no entendió de esta clase. El asistente responde
        con el contenido de la transcripción.
      </p>

      {error && (
        <div className="alerta-error" role="alert" tabIndex={-1} ref={errorRef}>
          {error}
        </div>
      )}

      {loadingHistory && <p aria-live="polite">Cargando sus preguntas anteriores…</p>}

      {/* El role="log" va en el contenedor y no en la lista: puesto sobre el
          <ol> anularia su semantica, y el lector de pantalla dejaria de
          anunciar cuantos intercambios hay. aria-live avisa de lo nuevo sin
          robar el foco a quien esta escribiendo. */}
      <div role="log" aria-live="polite" aria-label="Conversación">
        <ol className="tutor__conversacion">
        {exchanges.map((intercambio) => (
          <li key={intercambio.id_consulta} className="tutor__intercambio">
            <div className="tutor__pregunta">
              {/* La etiqueta va escrita, no insinuada por el color o la
                  posicion: asi el lector de pantalla distingue quien habla. */}
              <span className="tutor__quien">Usted preguntó:</span>
              <p>{intercambio.pregunta}</p>
            </div>
            <div className="tutor__respuesta">
              <span className="tutor__quien">El asistente respondió:</span>
              {/* Se respetan los saltos de linea: el asistente responde en
                  pasos numerados, y aplastarlos arruinaria la explicacion. */}
              <p className="tutor__texto">{intercambio.respuesta}</p>
            </div>
            </li>
          ))}
        </ol>
      </div>

      {exchanges.length === 0 && !loadingHistory && (
        <p className="tutor__vacio">
          Todavía no ha hecho preguntas sobre esta clase.
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <label className="form-field__label" htmlFor="pregunta-tutor">
          Su pregunta
        </label>
        <textarea
          id="pregunta-tutor"
          ref={inputRef}
          className="tutor__campo"
          value={question}
          onChange={(evento) => setQuestion(evento.target.value)}
          rows={3}
          maxLength={LARGO_MAXIMO}
          disabled={asking}
          aria-describedby="ayuda-pregunta"
        />
        <p id="ayuda-pregunta" className="form-field__help">
          Por ejemplo: «no entendí qué es un denominador».
        </p>

        <button className="boton-principal" type="submit" disabled={asking}>
          {asking ? 'Preguntando…' : 'Enviar pregunta'}
        </button>

        <p className="sr-only" aria-live="polite">
          {asking ? 'Esperando la respuesta del asistente.' : ''}
        </p>
      </form>
    </section>
  );
}
