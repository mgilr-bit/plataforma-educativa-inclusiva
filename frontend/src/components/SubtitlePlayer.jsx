// Reproductor con subtitulos y transcripcion sincronizada.
//
// Es la pieza central de la plataforma. Dos decisiones la gobiernan:
//
// 1. Los subtitulos se entregan al reproductor como pista WebVTT nativa, para
//    que el navegador los dibuje respetando los ajustes de subtitulos que el
//    usuario ya configuro en su sistema operativo.
//
// 2. Ademas se muestra la transcripcion completa al lado, siempre visible. Un
//    estudiante sordo puede preferir leer el texto entero a su ritmo antes que
//    seguir el video, y sin esa lista el contenido solo existe mientras el
//    video avanza.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createVttUrl } from '../utils/webvtt';
import './SubtitlePlayer.css';

// Los tiempos llegan como texto desde la API.
function toSeconds(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatMinutes(seconds) {
  const total = Math.floor(toSeconds(seconds));
  const minutos = Math.floor(total / 60);
  const restantes = total % 60;
  return `${minutos}:${String(restantes).padStart(2, '0')}`;
}

export default function SubtitlePlayer({ content, subtitles }) {
  const mediaRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [mediaError, setMediaError] = useState(false);

  const esAudio = content.tipo === 'audio';
  const tieneMedio = Boolean(content.url_archivo) && (esAudio || content.tipo === 'video');

  // La URL de la pista se crea una vez y se libera al desmontar: cada llamada
  // a createObjectURL reserva memoria hasta que se revoca.
  const vttUrl = useMemo(() => createVttUrl(subtitles), [subtitles]);
  useEffect(() => () => {
    if (vttUrl) URL.revokeObjectURL(vttUrl);
  }, [vttUrl]);

  const indiceActual = subtitles.findIndex(
    (s) => currentTime >= toSeconds(s.tiempo_inicio) && currentTime < toSeconds(s.tiempo_fin)
  );

  function saltarA(segundos) {
    if (mediaRef.current) {
      mediaRef.current.currentTime = toSeconds(segundos);
      mediaRef.current.play?.().catch(() => {
        // El navegador puede rechazar la reproducción automática; no es un
        // fallo que deba interrumpir al usuario.
      });
    }
  }

  const Medio = esAudio ? 'audio' : 'video';

  return (
    <div className="reproductor">
      {tieneMedio && !mediaError && (
        <Medio
          ref={mediaRef}
          className="reproductor__medio"
          src={content.url_archivo}
          controls
          onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
          onError={() => setMediaError(true)}
        >
          {vttUrl && (
            <track kind="captions" srcLang="es" label="Español" src={vttUrl} default />
          )}
        </Medio>
      )}

      {mediaError && (
        <p className="reproductor__aviso" role="status">
          No se pudo reproducir el archivo. Puede leer la transcripción completa
          más abajo.
        </p>
      )}

      {!tieneMedio && (
        <p className="reproductor__aviso">
          Este material no tiene archivo para reproducir. A continuación está su
          transcripción.
        </p>
      )}

      <h2 id="titulo-transcripcion">Transcripción</h2>
      <p className="reproductor__ayuda">
        Puede leer el texto completo a su ritmo. Si el material tiene video o
        audio, al pulsar un fragmento salta a ese momento.
      </p>

      <ol className="transcripcion" aria-labelledby="titulo-transcripcion">
        {subtitles.map((segmento, indice) => {
          const activo = indice === indiceActual;
          return (
            <li
              key={segmento.id_subtitulo}
              className={`transcripcion__linea${activo ? ' transcripcion__linea--activa' : ''}`}
              // aria-current avisa al lector de pantalla de cuál se está
              // reproduciendo; el resaltado visual solo no se lo diría.
              aria-current={activo ? 'true' : undefined}
            >
              {tieneMedio ? (
                <button
                  type="button"
                  className="transcripcion__salto"
                  onClick={() => saltarA(segmento.tiempo_inicio)}
                >
                  <span className="transcripcion__tiempo">
                    {formatMinutes(segmento.tiempo_inicio)}
                    <span className="sr-only">
                      {` — ir al minuto ${formatMinutes(segmento.tiempo_inicio)}`}
                    </span>
                  </span>
                  <span className="transcripcion__texto">{segmento.segmento_texto}</span>
                </button>
              ) : (
                <span className="transcripcion__texto">{segmento.segmento_texto}</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
