// Pantalla de un material: reproductor, subtitulos y transcripcion.
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import Layout from '../components/Layout';
import SubtitlePlayer from '../components/SubtitlePlayer';
import TutorChat from '../components/TutorChat';
import GenerateTranscription from '../components/GenerateTranscription';
import { puedeGenerar, puedeRevisar } from '../utils/transcripcion';
import TranscriptionReview from '../components/TranscriptionReview';
import { useAuth } from '../context/AuthContext';
import { LoadingState, ErrorState, EmptyState } from '../components/EstadoCarga';
import './Panel.css';
import usePageTitle from '../hooks/usePageTitle';

const REVISION = {
  pendiente: 'Sin revisar por el docente',
  revisada: 'Revisada por el docente',
  aprobada: 'Aprobada por el docente',
};

export default function ContentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true });
  // Tras generarla, el foco tiene que ir a parar a la transcripcion: el boton
  // que se pulso desaparece, y quien navega con teclado se quedaria sin punto
  // de partida en medio de la pagina.
  const transcripcionRef = useRef(null);
  const recienGenerada = useRef(false);

  // El asistente registra las consultas contra el estudiante que pregunta,
  // asi que solo se ofrece a ese rol.
  const puedePreguntar = user?.rol === 'estudiante';

  function load() {
    setState({ loading: true });
    // El material y su transcripcion se piden a la vez, pero la falta de
    // transcripcion no es un error: puede que aun no se haya generado.
    Promise.all([
      api.contents(),
      api.transcription(id).catch((error) => (error.status === 404 ? null : Promise.reject(error))),
    ])
      .then(([contenidos, transcripcion]) => {
        const contenido = contenidos.contenidos.find((c) => String(c.id_contenido) === String(id));
        if (!contenido) {
          setState({ loading: false, error: 'No se encontró el material.' });
          return;
        }
        setState({ loading: false, content: contenido, transcription: transcripcion });
      })
      .catch((error) => setState({ loading: false, error: error.message }));
  }

  useEffect(load, [id]);

  useEffect(() => {
    if (state.transcription && recienGenerada.current) {
      recienGenerada.current = false;
      transcripcionRef.current?.focus();
    }
  }, [state.transcription]);

  // Mientras carga se anuncia el respaldo; al llegar el dato, su nombre.
  usePageTitle(state.loading ? 'Material' : (state.content?.titulo || 'Material'));

  return (
    <Layout>
      <nav aria-label="Ruta de navegación" className="migas">
        <Link to="/panel">Mis cursos</Link>
        <span aria-hidden="true"> › </span>
        {state.content ? (
          <>
            <Link to={`/cursos/${state.content.id_curso}`}>{state.content.curso}</Link>
            <span aria-hidden="true"> › </span>
            <span aria-current="page">{state.content.titulo}</span>
          </>
        ) : (
          <span aria-current="page">Material</span>
        )}
      </nav>

      {state.loading && <LoadingState label="Cargando el material…" />}
      {state.error && <ErrorState message={state.error} onRetry={load} />}

      {state.content && (
        <>
          <h1>{state.content.titulo}</h1>

          {state.transcription && (
            <p className="tarjeta__detalle">
              {REVISION[state.transcription.transcripcion.estado_revision]
                || state.transcription.transcripcion.estado_revision}
            </p>
          )}

          {state.transcription ? (
            <section
              ref={transcripcionRef}
              tabIndex={-1}
              aria-labelledby="titulo-transcripcion"
            >
              <SubtitlePlayer
                content={state.content}
                subtitles={state.transcription.subtitulos}
              />
            </section>
          ) : (
            <>
              {/* El boton se ofrece solo a quien puede generarla. Al resto se
                  le explica la espera, que es lo unico que le sirve saber. */}
              <GenerateTranscription
                content={state.content}
                onGenerated={() => { recienGenerada.current = true; load(); }}
              />
              {!puedeGenerar(user, state.content) && (
                <EmptyState
                  title="Este material todavía no tiene transcripción"
                  description="Cuando el docente la genere, el texto y los subtítulos aparecerán aquí."
                />
              )}
            </>
          )}

          {puedePreguntar && <TutorChat contentId={Number(id)} />}

          {/* La correccion va debajo de la clase, no en otra pantalla: el
              docente corrige mientras escucha lo que la maquina entendio. */}
          {state.transcription && puedeRevisar(user, state.content) && (
            <TranscriptionReview
              transcription={state.transcription.transcripcion}
              subtitles={state.transcription.subtitulos}
              onUpdated={load}
            />
          )}
        </>
      )}
    </Layout>
  );
}
