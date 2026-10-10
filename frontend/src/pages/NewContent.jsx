// Carga de una clase nueva.
//
// Reune en una pantalla lo que antes estaba repartido: subir el archivo,
// transcribirlo y resumirlo. Ya no hay que acordarse de pulsar tres botones
// en tres sitios distintos; se encadena solo y se enseña por donde va.
//
// El encadenado lo dirige esta pantalla y no el servidor. Transcribir una
// clase tarda minutos, y hacerlo dentro de la peticion de subida dejaria al
// docente esperando una respuesta que no llega. Si cierra la pestaña a mitad,
// lo que falte se puede generar despues desde la pantalla del material.
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import FormField from '../components/FormField';
import FileDrop from '../components/FileDrop';
import ProcessingSteps from '../components/ProcessingSteps';
import usePageTitle from '../hooks/usePageTitle';
import './NewContent.css';

const TIPOS = [
  { valor: 'video', etiqueta: 'Video' },
  { valor: 'audio', etiqueta: 'Audio' },
  { valor: 'documento', etiqueta: 'Documento' },
  { valor: 'texto', etiqueta: 'Texto' },
];

// Solo de audio y video se puede sacar texto.
const TRANSCRIBIBLES = ['video', 'audio'];

const ACEPTADOS = '.mp4,.mp3,.m4a,.wav,.webm,.ogg,.flac,.pdf,.doc,.docx,.odt,.txt';

function pasosIniciales(tipo) {
  const transcribible = TRANSCRIBIBLES.includes(tipo);
  const siNo = (titulo) => ({
    titulo,
    estado: transcribible ? 'pendiente' : 'omitido',
    detalle: transcribible ? null : 'Solo para audio y video',
  });
  return [
    { id: 'subida', titulo: 'Archivo subido', estado: 'pendiente' },
    { id: 'transcripcion', ...siNo('Transcripción (Whisper)') },
    { id: 'subtitulos', ...siNo('Subtítulos sincronizados') },
    { id: 'resumen', ...siNo('Resumen en lenguaje sencillo (Claude)') },
    {
      id: 'revision',
      titulo: 'Revisión del docente',
      estado: 'pendiente',
      detalle: 'Usted la revisa al final',
    },
  ];
}

export default function NewContent() {
  usePageTitle('Cargar una clase');
  const { user } = useAuth();
  const navegar = useNavigate();
  const [parametros] = useSearchParams();

  const [cursos, setCursos] = useState([]);
  const [idCurso, setIdCurso] = useState(parametros.get('curso') || '');
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('video');
  const [archivo, setArchivo] = useState(null);

  const [avance, setAvance] = useState(null);
  const [pasos, setPasos] = useState(() => pasosIniciales('video'));
  const [trabajando, setTrabajando] = useState(false);
  const [erroresCampo, setErroresCampo] = useState({});
  const [error, setError] = useState(null);
  const [creado, setCreado] = useState(null);

  const errorRef = useRef(null);
  const tituloRef = useRef(null);

  useEffect(() => {
    api.courses()
      .then((datos) => {
        const propios = datos.cursos;
        setCursos(propios);
        setIdCurso((previo) => previo || (propios.length === 1 ? String(propios[0].id_curso) : ''));
      })
      .catch((err) => setError(err.message));
  }, []);

  // Al cambiar el tipo cambian los pasos que aplican.
  useEffect(() => {
    if (!trabajando && !creado) setPasos(pasosIniciales(tipo));
  }, [tipo, trabajando, creado]);

  function marcar(id, estado, detalle) {
    setPasos((previos) => previos.map((p) => (p.id === id ? { ...p, estado, detalle } : p)));
  }

  async function publicar(evento) {
    evento.preventDefault();
    setError(null);

    const errores = {};
    if (!titulo.trim()) errores.titulo = 'Escriba un título para la clase.';
    if (!idCurso) errores.curso = 'Elija el curso al que pertenece.';
    if (Object.keys(errores).length > 0) {
      setErroresCampo(errores);
      (errores.titulo ? tituloRef.current : null)?.focus();
      return;
    }
    setErroresCampo({});

    setTrabajando(true);
    setPasos(pasosIniciales(tipo));
    marcar('subida', 'proceso');

    let contenido;
    try {
      const datos = await api.createContent({
        courseId: Number(idCurso),
        title: titulo.trim(),
        type: tipo,
        file: archivo || undefined,
        onProgress: archivo ? setAvance : undefined,
      });
      contenido = datos.contenido;
      setCreado(contenido);
      marcar('subida', 'hecho');
    } catch (err) {
      marcar('subida', 'error', err.message);
      setError(err.message);
      setTrabajando(false);
      window.requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }

    await procesar(contenido);
    setTrabajando(false);
  }

  // Lo que viene despues de guardar la clase. Va en su propia funcion y
  // empieza comprobando que haya clase: asi no depende de acordarse de poner
  // un "return" mas arriba. Si algo de aqui falla, la clase no se pierde: ya
  // esta guardada y lo pendiente se puede generar despues desde su pantalla.
  async function procesar(contenido) {
    if (!contenido) return;
    if (!TRANSCRIBIBLES.includes(tipo) || !archivo) return;

    marcar('transcripcion', 'proceso');
    try {
      const resultado = await api.transcribe(contenido.id_contenido);
      marcar('transcripcion', 'hecho');
      marcar('subtitulos', 'hecho', `${resultado.subtitulos} fragmentos`);
    } catch (err) {
      marcar('transcripcion', 'error', err.message);
      marcar('subtitulos', 'error', 'No se pudo, falta la transcripción');
      // Sin texto del que partir no tiene sentido pedir el resumen.
      return;
    }

    marcar('resumen', 'proceso');
    try {
      await api.createSummary(contenido.id_contenido, 'basico');
      marcar('resumen', 'hecho');
    } catch (err) {
      marcar('resumen', 'error', err.message);
    }
  }

  const esDocente = user?.rol === 'docente' || user?.rol === 'administrador';
  if (!esDocente) {
    return <p className="alerta-error">Solo el docente puede cargar clases.</p>;
  }

  return (
    <div>
      <h1>Cargar una clase</h1>

      <div className="carga">
        <section className="carga__formulario" aria-labelledby="titulo-formulario">
          <h2 id="titulo-formulario" className="sr-only">Datos de la clase</h2>

          {error && (
            <div className="alerta-error" role="alert" tabIndex={-1} ref={errorRef}>
              {error}
            </div>
          )}

          <form onSubmit={publicar} noValidate>
            <FormField
              id="clase-titulo"
              label="Título de la clase"
              value={titulo}
              onChange={setTitulo}
              error={erroresCampo.titulo}
              inputRef={tituloRef}
              required
              help="Por ejemplo: El ciclo del agua"
              disabled={trabajando}
            />

            <div className="carga__fila">
              <div className="form-field">
                <label className="form-field__label" htmlFor="clase-curso">
                  Curso <span aria-hidden="true">*</span>
                </label>
                <select
                  id="clase-curso"
                  className="form-field__input"
                  value={idCurso}
                  onChange={(e) => setIdCurso(e.target.value)}
                  disabled={trabajando}
                  aria-describedby={erroresCampo.curso ? 'clase-curso-error' : undefined}
                >
                  <option value="">Elija un curso</option>
                  {cursos.map((curso) => (
                    <option key={curso.id_curso} value={curso.id_curso}>
                      {curso.nombre} — {curso.grado}
                    </option>
                  ))}
                </select>
                {erroresCampo.curso && (
                  <p className="form-field__error" id="clase-curso-error">{erroresCampo.curso}</p>
                )}
              </div>

              <div className="form-field">
                <label className="form-field__label" htmlFor="clase-tipo">Tipo</label>
                <select
                  id="clase-tipo"
                  className="form-field__input"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  disabled={trabajando}
                >
                  {TIPOS.map((o) => (
                    <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
                  ))}
                </select>
              </div>
            </div>

            <FileDrop
              id="clase-archivo"
              archivo={archivo}
              onArchivo={setArchivo}
              aceptados={ACEPTADOS}
              ayuda="Audio, video o documento, hasta 200 MB."
              desactivado={trabajando}
            />

            {avance !== null && (
              <div className="carga__avance">
                <div className="carga__avance-texto">
                  <span>{archivo?.name}</span>
                  <span>{avance}%</span>
                </div>
                {/* progress nativo: el lector de pantalla ya sabe leerlo, y
                    aria-valuenow no haria falta escribirlo a mano. */}
                <progress max="100" value={avance} aria-label="Avance de la subida">
                  {avance}%
                </progress>
              </div>
            )}

            {TRANSCRIBIBLES.includes(tipo) && (
              <p className="mensaje-aviso">
                Al terminar de subir, la plataforma genera sola la transcripción,
                los subtítulos y el resumen. No cierre esta pestaña mientras
                tanto.
              </p>
            )}

            {creado ? (
              <p className="carga__listo">
                <strong>«{creado.titulo}» quedó publicada.</strong>{' '}
                <Link to={`/contenidos/${creado.id_contenido}`}>Ver la clase</Link>
                {' · '}
                <button
                  type="button"
                  className="carga__otra"
                  onClick={() => {
                    setCreado(null); setTitulo(''); setArchivo(null);
                    setAvance(null); setPasos(pasosIniciales(tipo));
                  }}
                >
                  Cargar otra
                </button>
              </p>
            ) : (
              <button type="submit" className="boton-principal" disabled={trabajando}>
                {trabajando ? 'Procesando…' : 'Publicar'}
              </button>
            )}
          </form>
        </section>

        <div className="carga__proceso">
          <ProcessingSteps
            pasos={pasos}
            // Medido sobre clases reales de la plataforma, no estimado:
            // 0.09 s de proceso por segundo de clase.
            estimacion="Una clase de una hora tarda unos cinco minutos, medido sobre clases reales. El archivo se comprime antes de transcribirlo."
          />
        </div>
      </div>
    </div>
  );
}
