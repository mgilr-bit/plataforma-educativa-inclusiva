// Pantalla de un material: reproductor, subtitulos y transcripcion.
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import MediaPlayer from '../components/MediaPlayer';
import TranscriptList from '../components/TranscriptList';
import Tabs from '../components/Tabs';
import useReproductor from '../hooks/useReproductor';
import useProgreso from '../hooks/useProgreso';
import TutorChat from '../components/TutorChat';
import GenerateTranscription from '../components/GenerateTranscription';
import { puedeGenerar, puedeRevisar } from '../utils/transcripcion';
import TranscriptionReview from '../components/TranscriptionReview';
import ContentSettings from '../components/ContentSettings';
import ClassSummary from '../components/ClassSummary';
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

  // El hook va aqui y no dentro del render condicional: los hooks no pueden
  // llamarse dentro de un if. Con el material aun sin cargar recibe valores
  // vacios y no hace nada.
  const subtitulos = state.transcription?.subtitulos || [];
  const reproductor = useReproductor({
    content: state.content || { tipo: 'texto', url_archivo: null },
    subtitles: subtitulos,
  });

  // Cuanto de la clase ha consumido el estudiante.
  //
  // De un video o un audio, hasta donde llego la reproduccion. De un documento
  // o un texto no hay nada que medir: abrirlo es haberlo recibido.
  const esReproducible = ['video', 'audio'].includes(state.content?.tipo);
  const duracion = reproductor.mediaRef.current?.duration;
  const porcentaje = !state.content
    ? 0
    : !esReproducible
      ? 100
      : Math.min(100, Math.max(
        1,
        Number.isFinite(duracion) && duracion > 0
          ? Math.round((reproductor.currentTime / duracion) * 100)
          : 1
      ));

  useProgreso({
    contentId: state.content ? Number(id) : null,
    // Solo el estudiante deja rastro: el docente abre sus propias clases para
    // revisarlas, y eso no es progreso de nadie.
    activo: user?.rol === 'estudiante',
    porcentaje,
  });
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
    // Ya no es una columna estrecha: el video y el panel ocupan el ancho, y
    // la medida de lectura la impone cada bloque de texto por dentro.
    <div>
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
            // El estado dice si lo que se lee ya paso por el docente o sigue
            // siendo lo que entendio la maquina. Como texto gris menudo nadie
            // lo leia.
            <p
              className={`etiqueta-estado etiqueta-estado--${state.transcription.transcripcion.estado_revision}`}
            >
              {REVISION[state.transcription.transcripcion.estado_revision]
                || state.transcription.transcripcion.estado_revision}
            </p>
          )}

          {/* La clase en dos columnas: el video a un lado y el material
              escrito al otro, visibles a la vez. Antes iba todo apilado y la
              transcripcion quedaba a una pantalla de distancia del video que
              describe. */}
          <div className="clase">
            <div className="clase__medio">
              <MediaPlayer content={state.content} reproductor={reproductor} />
            </div>

            <div
              className="clase__panel"
              ref={transcripcionRef}
              tabIndex={-1}
              role="region"
              aria-label="Material de la clase"
            >
              <Tabs
                etiqueta="Secciones del material"
                // Sin transcripcion, la pestaña util es la de la transcripcion:
                // ahi esta el boton de generarla y la explicacion de la espera.
                // Abrir el resumen dejaria lo unico accionable escondido detras
                // de una pestaña que hay que descubrir.
                inicial={state.transcription ? 'resumen' : 'transcripcion'}
                pestanas={[
                  {
                    id: 'resumen',
                    titulo: 'Resumen',
                    // El resumen abre primero: para quien lee con esfuerzo, el
                    // texto completo de la clase es justo la barrera.
                    contenido: (
                      <ClassSummary
                        contentId={Number(id)}
                        puedeGestionar={puedeRevisar(user, state.content)}
                        tieneTranscripcion={Boolean(state.transcription)}
                      />
                    ),
                  },
                  {
                    id: 'transcripcion',
                    titulo: 'Transcripción',
                    contenido: state.transcription ? (
                      <TranscriptList subtitles={subtitulos} reproductor={reproductor} />
                    ) : (
                      <>
                        {/* El boton se ofrece solo a quien puede generarla. Al
                            resto se le explica la espera. */}
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
                    ),
                  },
                  puedePreguntar && {
                    id: 'tutor',
                    titulo: 'Tutor',
                    contenido: <TutorChat contentId={Number(id)} />,
                  },
                ]}
              />
            </div>
          </div>

          {/* La correccion va debajo de la clase, no en otra pantalla: el
              docente corrige mientras escucha lo que la maquina entendio. */}
          {puedeRevisar(user, state.content) && (
            <ContentSettings
              content={state.content}
              tieneTranscripcion={Boolean(state.transcription)}
              onUpdated={load}
            />
          )}

          {state.transcription && puedeRevisar(user, state.content) && (
            <TranscriptionReview
              transcription={state.transcription.transcripcion}
              subtitles={state.transcription.subtitulos}
              onUpdated={load}
            />
          )}
        </>
      )}
    </div>
  );
}
