// Revisión de la transcripción por el docente.
//
// Whisper se equivoca, y para un estudiante sordo el texto no es un apoyo: es
// la clase. No tiene el audio para corregir lo que lea mal. Si la máquina
// escribe "mínimo común múltiple", eso es lo que aprende.
//
// Y el error no se queda quieto: el mismo texto alimenta los subtítulos, el
// asistente y cualquier resumen posterior. Por eso la corrección va aquí, al
// lado de la clase, y no en una pantalla aparte que nadie visita.
import { useState } from 'react';
import { api } from '../api/client';
import { enMinutos, enPalabras } from '../utils/tiempo';
import './TranscriptionReview.css';

const ESTADOS = [
  { valor: 'pendiente', etiqueta: 'Sin revisar' },
  { valor: 'revisada', etiqueta: 'Revisada' },
  { valor: 'aprobada', etiqueta: 'Aprobada' },
];

export default function TranscriptionReview({ transcription, subtitles, onUpdated }) {
  const [borradores, setBorradores] = useState({});
  const [guardando, setGuardando] = useState(null);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState('');
  const [estado, setEstado] = useState(transcription.estado_revision);

  const textoDe = (subtitulo) => (
    borradores[subtitulo.id_subtitulo] !== undefined
      ? borradores[subtitulo.id_subtitulo]
      : subtitulo.segmento_texto
  );

  const cambiado = (subtitulo) => textoDe(subtitulo).trim() !== subtitulo.segmento_texto.trim();

  async function guardar(subtitulo) {
    const texto = textoDe(subtitulo).trim();
    if (!texto) {
      // Un segmento vacío deja un hueco mudo en los subtítulos, y para quien
      // no oye eso es contenido perdido sin aviso de que falta.
      setError('El texto no puede quedar vacío. Si el fragmento sobra, déjelo como está.');
      return;
    }

    setError(null);
    setGuardando(subtitulo.id_subtitulo);
    try {
      await api.updateSubtitle(subtitulo.id_subtitulo, { segmentoTexto: texto });
      setAviso(`Se guardó la corrección de ${enPalabras(subtitulo.tiempo_inicio)}.`);
      setBorradores((previos) => {
        const copia = { ...previos };
        delete copia[subtitulo.id_subtitulo];
        return copia;
      });
      onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(null);
    }
  }

  async function marcar(nuevoEstado) {
    setError(null);
    try {
      await api.updateTranscription(transcription.id_transcripcion, { estadoRevision: nuevoEstado });
      setEstado(nuevoEstado);
      setAviso(`La transcripción quedó marcada como ${ESTADOS.find((e) => e.valor === nuevoEstado).etiqueta.toLowerCase()}.`);
      onUpdated();
    } catch (err) {
      setError(err.message);
    }
  }

  const corregidos = subtitles.filter((s) => s.editado_docente).length;

  return (
    <section className="revision" aria-labelledby="titulo-revision">
      <h2 id="titulo-revision">Revisar la transcripción</h2>
      <p className="revision__ayuda">
        La plataforma escribió este texto escuchando la clase, y a veces se
        equivoca. Para un estudiante sordo este texto es la clase: no tiene el
        audio para darse cuenta del error. Corrija lo que esté mal.
      </p>

      <p className="revision__cuenta">
        {corregidos === 0
          ? `${subtitles.length} fragmentos, ninguno corregido todavía.`
          : `${corregidos} de ${subtitles.length} fragmentos corregidos.`}
      </p>

      {error && <p className="revision__error" role="alert">{error}</p>}

      {/* Lo que se guardó se anuncia sin interrumpir: el docente sigue
          escribiendo en el siguiente fragmento mientras tanto. */}
      <p className="revision__estado-vivo" aria-live="polite">{aviso}</p>

      <ol className="revision__lista">
        {subtitles.map((subtitulo) => {
          const idCampo = `fragmento-${subtitulo.id_subtitulo}`;
          const momento = enPalabras(subtitulo.tiempo_inicio);
          return (
            <li key={subtitulo.id_subtitulo} className="revision__fila">
              <div className="revision__cabecera">
                <label className="revision__momento" htmlFor={idCampo}>
                  {/* Se ve "2:05" y se oye "el minuto 2 con 5 segundos": un
                      lector de pantalla leería "2:05" como "dos cero cinco". */}
                  <span aria-hidden="true">{enMinutos(subtitulo.tiempo_inicio)}</span>
                  <span className="sr-only">Fragmento que empieza en {momento}</span>
                </label>
                {subtitulo.editado_docente && (
                  <span className="revision__marca">Corregido</span>
                )}
              </div>

              <textarea
                id={idCampo}
                className="revision__campo"
                rows={2}
                value={textoDe(subtitulo)}
                onChange={(evento) => setBorradores((previos) => ({
                  ...previos,
                  [subtitulo.id_subtitulo]: evento.target.value,
                }))}
                disabled={guardando === subtitulo.id_subtitulo}
              />

              <button
                type="button"
                className="revision__guardar"
                onClick={() => guardar(subtitulo)}
                disabled={!cambiado(subtitulo) || guardando === subtitulo.id_subtitulo}
                aria-label={`Guardar la corrección del fragmento que empieza en ${momento}`}
              >
                {guardando === subtitulo.id_subtitulo ? 'Guardando…' : 'Guardar'}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="revision__cierre">
        <h3>Estado de la revisión</h3>
        <p className="revision__ayuda">
          El estudiante ve este estado. Así sabe si lo que está leyendo ya pasó
          por usted o todavía es lo que escribió la máquina.
        </p>
        <div className="revision__estados">
          {ESTADOS.map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              className={`revision__estado${estado === opcion.valor ? ' revision__estado--activo' : ''}`}
              onClick={() => marcar(opcion.valor)}
              aria-pressed={estado === opcion.valor}
            >
              {opcion.etiqueta}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
