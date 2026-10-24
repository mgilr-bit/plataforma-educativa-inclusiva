// La transcripcion completa de la clase.
//
// No es un complemento del video: para un estudiante sordo es el contenido.
// Sin esta lista, la clase solo existe mientras el video avanza, y no se puede
// releer un parrafo ni buscar una palabra.
import { formatMinutes } from '../hooks/useReproductor';
import './TranscriptList.css';

export default function TranscriptList({ subtitles, reproductor }) {
  const { tieneMedio, indiceActual, saltarA } = reproductor;

  return (
    <div className="transcripcion">
      <p className="transcripcion__ayuda">
        Puede leer el texto completo a su ritmo.
        {tieneMedio && ' Al pulsar un fragmento, el video salta a ese momento.'}
      </p>

      <ol className="transcripcion__lista" aria-label="Transcripción de la clase">
        {subtitles.map((segmento, indice) => {
          const activo = indice === indiceActual;
          return (
            <li
              key={segmento.id_subtitulo}
              className={`transcripcion__linea${activo ? ' transcripcion__linea--activa' : ''}`}
              // aria-current avisa al lector de pantalla de cual se esta
              // reproduciendo; el resaltado visual solo no se lo diria.
              aria-current={activo ? 'true' : undefined}
            >
              {tieneMedio ? (
                <button
                  type="button"
                  className="transcripcion__salto"
                  onClick={() => saltarA(segmento.tiempo_inicio)}
                >
                  {/* El nombre accesible se compone, no se declara con
                      aria-label. Con aria-label el nombre decia "Ir al minuto
                      0:00: Buenas tardes..." mientras en pantalla se leia
                      "0:00 Buenas tardes...", y el texto visible dejaba de
                      estar contenido en el nombre: quien maneja la plataforma
                      por voz dice lo que ve y no acertaba el boton.
                      El espacio es explicito porque al componer el nombre las
                      partes se pegan: dentro del <span> se descarta, fuera
                      cuenta. */}
                  <span className="sr-only">Ir al minuto</span>
                  {' '}
                  <span className="transcripcion__tiempo">
                    {formatMinutes(segmento.tiempo_inicio)}
                  </span>
                  {' '}
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
