// Panel de seguimiento del docente.
//
// Los numeros por si solos no dicen que hacer. Un docente con veinticinco
// estudiantes ve una tabla y tiene que deducir donde esta el problema; por eso
// el panel termina con una sugerencia que lee los mismos datos y propone
// acciones concretas.
//
// Importa especialmente aqui: un estudiante sordo puede no preguntar por pena,
// de modo que el avance es a veces la unica señal de que algo no va bien.
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { LoadingState, ErrorState, EmptyState } from '../components/EstadoCarga';
import { guardarArchivo } from '../utils/descargar';
import usePageTitle from '../hooks/usePageTitle';
import './Tracking.css';

function fechaLegible(valor) {
  if (!valor) return 'Nunca';
  const f = new Date(valor);
  return f.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function Tracking() {
  usePageTitle('Seguimiento');
  const [cursos, setCursos] = useState([]);
  const [idCurso, setIdCurso] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [sugerencia, setSugerencia] = useState(null);
  const [pensando, setPensando] = useState(false);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    api.courses()
      .then((d) => {
        setCursos(d.cursos);
        if (d.cursos.length > 0) setIdCurso(String(d.cursos[0].id_curso));
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!idCurso) return;
    setCargando(true);
    setSugerencia(null);
    api.tracking(idCurso, { desde, hasta })
      .then(setDatos)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, [idCurso, desde, hasta]);

  async function exportar() {
    setExportando(true);
    setError(null);
    try {
      const { blob, nombre } = await api.exportTracking(idCurso, { desde, hasta });
      guardarArchivo(blob, nombre);
    } catch (err) {
      setError(err.message);
    } finally {
      setExportando(false);
    }
  }

  async function pedirSugerencia() {
    setPensando(true);
    setError(null);
    try {
      const d = await api.suggestion(idCurso, { desde, hasta });
      setSugerencia(d.sugerencia);
    } catch (err) {
      setError(err.message);
    } finally {
      setPensando(false);
    }
  }

  const maxConsultas = Math.max(1, ...(datos?.temas || []).map((t) => t.consultas));

  return (
    <div>
      <h1>Seguimiento por estudiante</h1>

      {error && <p className="alerta-error" role="alert">{error}</p>}

      <div className="seguimiento__filtros">
        <div className="form-field">
          <label className="form-field__label" htmlFor="seg-curso">Curso</label>
          <select
            id="seg-curso"
            className="form-field__input"
            value={idCurso}
            onChange={(e) => setIdCurso(e.target.value)}
          >
            {cursos.map((c) => (
              <option key={c.id_curso} value={c.id_curso}>{c.nombre} — {c.grado}</option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label className="form-field__label" htmlFor="seg-desde">Desde</label>
          <input
            id="seg-desde" className="form-field__input" type="date"
            value={desde} onChange={(e) => setDesde(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label className="form-field__label" htmlFor="seg-hasta">Hasta</label>
          <input
            id="seg-hasta" className="form-field__input" type="date"
            value={hasta} onChange={(e) => setHasta(e.target.value)}
          />
        </div>

        {/* Boton y no enlace. Un enlace lo sigue el navegador, y la
            navegacion no lleva la cabecera de autenticacion: el archivo lo
            pide este cliente, que si pone el token, y se guarda desde
            memoria. */}
        {idCurso && (
          <button
            type="button"
            className="seguimiento__exportar"
            onClick={exportar}
            disabled={exportando}
          >
            {exportando ? 'Preparando…' : 'Exportar a hoja de cálculo'}
          </button>
        )}
      </div>

      {cargando && <LoadingState label="Cargando el seguimiento…" />}

      {datos && !cargando && (
        <>
          <div className="seguimiento">
            <section className="seguimiento__tabla" aria-labelledby="titulo-tabla">
              <h2 id="titulo-tabla" className="sr-only">Avance de cada estudiante</h2>

              {datos.estudiantes.length === 0 ? (
                <EmptyState
                  title="Este curso todavía no tiene estudiantes"
                  description="Inscriba estudiantes para poder seguir su avance."
                />
              ) : (
                // El desplazamiento va dentro de la tabla, no en la página.
                // El criterio de reflujo exceptúa las tablas de datos —no se
                // pueden apilar sin perder el sentido de las filas—, pero lo
                // que no admite es que arrastre a toda la pantalla.
                // Es enfocable para poder desplazarla con teclado.
                <div
                  className="tabla-ancha"
                  tabIndex={0}
                  role="region"
                  aria-label="Tabla de avance por estudiante"
                >
                <table className="tabla">
                  <caption className="sr-only">
                    Avance, última visita y consultas al asistente de cada estudiante
                    en {datos.curso.nombre}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Estudiante</th>
                      <th scope="col">Avance</th>
                      <th scope="col">Última visita</th>
                      <th scope="col">Consultas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.estudiantes.map((e) => (
                      <tr key={e.id_usuario}>
                        <th scope="row">{e.nombre_completo}</th>
                        <td>
                          <span className="barra">
                            {/* La barra acompaña al numero, no lo sustituye:
                                el porcentaje se lee aunque no se vea la
                                barra. */}
                            <span className="barra__relleno" style={{ width: `${e.avance}%` }} />
                          </span>
                          <span className="barra__valor">{e.avance}%</span>
                        </td>
                        <td>{fechaLegible(e.ultima_visita)}</td>
                        <td>{e.consultas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </section>

            <section className="seguimiento__temas" aria-labelledby="titulo-temas">
              <h2 id="titulo-temas">Temas con más consultas</h2>

              {datos.temas.length === 0 ? (
                <p className="seguimiento__nota">
                  Todavía nadie le ha preguntado al asistente en este curso.
                </p>
              ) : (
                // Lista de definiciones y no un grafico: el dato se lee igual
                // con lector de pantalla, y la barra solo lo acompaña.
                <dl className="temas">
                  {datos.temas.map((t) => (
                    <div key={t.id_contenido} className="temas__fila">
                      <dt>{t.titulo}</dt>
                      <dd>
                        <span className="barra">
                          <span
                            className="barra__relleno"
                            style={{ width: `${(t.consultas / maxConsultas) * 100}%` }}
                          />
                        </span>
                        <span className="barra__valor">
                          {t.consultas} {t.consultas === 1 ? 'consulta' : 'consultas'}
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              <p className="seguimiento__nota">
                Fuente: consultas al asistente registradas en el periodo elegido.
              </p>
            </section>
          </div>

          <section className="sugerencia" aria-labelledby="titulo-sugerencia">
            <h2 id="titulo-sugerencia">Sugerencia pedagógica</h2>

            <p className="sugerencia__estado-vivo" aria-live="polite">
              {pensando ? 'Preparando la sugerencia…' : ''}
            </p>

            {sugerencia ? (
              <p className="sugerencia__texto">{sugerencia}</p>
            ) : (
              <>
                <p className="seguimiento__nota">
                  El asistente lee estos mismos datos y propone qué reforzar.
                </p>
                <button
                  type="button"
                  className="boton-principal"
                  onClick={pedirSugerencia}
                  disabled={pensando || datos.estudiantes.length === 0}
                >
                  {pensando ? 'Preparando…' : 'Pedir una sugerencia'}
                </button>
              </>
            )}
          </section>
        </>
      )}

      {!cargando && cursos.length === 0 && !error && (
        <EmptyState
          title="Todavía no imparte ningún curso"
          description="Cuando el administrador le asigne un curso, aquí verá el avance de sus estudiantes."
        />
      )}
    </div>
  );
}
